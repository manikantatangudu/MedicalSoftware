from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime, timezone
import io
import csv

from app.core.database import get_db
from app.models.user import User
from app.models.master import Medicine
from app.models.inventory import Batch
from app.models.billing import Bill, BillItem, ScheduleRegisterEntry
from app.models.audit import AuditLog
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/dashboard")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns high-level store metrics:
    - Today's sales & bill count
    - Total medicines count
    - Low stock alerts count
    - Near-expiry alerts count
    - Gross estimated revenue
    """
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Today's sales
    today_sales_query = db.query(
        func.coalesce(func.sum(Bill.total), 0.0),
        func.count(Bill.id)
    ).filter(
        Bill.tenant_id == current_user.tenant_id,
        Bill.created_at >= today_start
    ).first()

    today_sales_amount = float(today_sales_query[0]) if today_sales_query else 0.0
    today_bills_count = int(today_sales_query[1]) if today_sales_query else 0

    # Total lifetime sales
    total_sales_lifetime = db.query(func.coalesce(func.sum(Bill.total), 0.0)).filter(
        Bill.tenant_id == current_user.tenant_id
    ).scalar()

    # Total active medicines
    total_medicines = db.query(Medicine).filter(
        Medicine.tenant_id == current_user.tenant_id,
        Medicine.is_active == True
    ).count()

    # Expired batches count
    expired_count = db.query(Batch).filter(
        Batch.tenant_id == current_user.tenant_id,
        Batch.quantity_remaining > 0,
        Batch.expiry_date < date.today()
    ).count()

    return {
        "today_sales": round(today_sales_amount, 2),
        "today_bills_count": today_bills_count,
        "lifetime_sales": round(float(total_sales_lifetime), 2),
        "total_medicines": total_medicines,
        "expired_batches_count": expired_count
    }

@router.get("/sales")
def get_sales_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detailed sales report with filterable date ranges."""
    query = db.query(Bill).filter(Bill.tenant_id == current_user.tenant_id)

    if start_date:
        query = query.filter(Bill.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(Bill.created_at <= datetime.combine(end_date, datetime.max.time()))

    bills = query.order_by(Bill.created_at.desc()).all()

    total_revenue = sum(b.total for b in bills)
    total_tax = sum(b.tax for b in bills)
    total_discount = sum(b.discount for b in bills)

    return {
        "count": len(bills),
        "total_revenue": round(total_revenue, 2),
        "total_tax_collected": round(total_tax, 2),
        "total_discount_given": round(total_discount, 2),
        "bills": [
            {
                "id": b.id,
                "bill_number": b.bill_number,
                "date": str(b.created_at),
                "payment_mode": b.payment_mode.value,
                "subtotal": b.subtotal,
                "tax": b.tax,
                "discount": b.discount,
                "total": b.total,
                "status": b.status.value
            }
            for b in bills
        ]
    }

@router.get("/tax-summary")
def get_tax_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Tax summary for GST accountant filings.
    Calculates total taxable value, CGST, and SGST splits.
    """
    bills = db.query(Bill).filter(Bill.tenant_id == current_user.tenant_id).all()
    total_tax = sum(b.tax for b in bills)
    total_taxable = sum(b.subtotal for b in bills)

    return {
        "total_taxable_value": round(total_taxable, 2),
        "total_gst_collected": round(total_tax, 2),
        "cgst_split": round(total_tax / 2.0, 2),
        "sgst_split": round(total_tax / 2.0, 2)
    }

@router.get("/schedule-register")
def get_schedule_register(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns statutory Schedule H1 & X register entries for government audits."""
    entries = db.query(ScheduleRegisterEntry).filter(
        ScheduleRegisterEntry.tenant_id == current_user.tenant_id
    ).order_by(ScheduleRegisterEntry.dispensed_date.desc()).offset(skip).limit(limit).all()

    return entries

@router.get("/export/schedule-register-csv")
def export_schedule_register_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Exports statutory Schedule H1 / X drug register as a CSV file for drug inspector audits.
    """
    entries = db.query(ScheduleRegisterEntry).filter(
        ScheduleRegisterEntry.tenant_id == current_user.tenant_id
    ).order_by(ScheduleRegisterEntry.dispensed_date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Dispensed Date", "Bill ID", "Medicine ID", "Patient Name",
        "Patient Phone", "Patient Address", "Quantity", "Doctor ID"
    ])

    for e in entries:
        writer.writerow([
            str(e.dispensed_date), e.bill_id, e.medicine_id,
            e.patient_name, e.patient_phone, e.patient_address,
            e.quantity, e.doctor_id or "N/A"
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=schedule_drug_register.csv"}
    )

@router.get("/audit-logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Immutable audit trail of actions taken in the pharmacy."""
    logs = db.query(AuditLog).filter(
        AuditLog.tenant_id == current_user.tenant_id
    ).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": l.id,
            "action": l.action,
            "entity": l.entity,
            "entity_id": l.entity_id,
            "metadata_json": l.metadata_json,
            "created_at": str(l.created_at)
        }
        for l in logs
    ]

