import pytest
from datetime import date

def test_dashboard_metrics(client, owner_headers):
    """Scenario 22: High-level store dashboard KPI metrics."""
    res = client.get("/api/v1/reports/dashboard", headers=owner_headers)
    assert res.status_code == 200
    data = res.json()
    assert "today_sales" in data
    assert "today_bills_count" in data
    assert "lifetime_sales" in data
    assert "total_medicines" in data
    assert "expired_batches_count" in data
    assert data["total_medicines"] > 0

def test_sales_report_with_date_filtering(client, owner_headers):
    """Scenario 23: Detailed Sales Ledger with date range filter."""
    today = date.today().isoformat()
    res = client.get(f"/api/v1/reports/sales?start_date={today}&end_date={today}", headers=owner_headers)
    assert res.status_code == 200
    report = res.json()
    assert "count" in report
    assert "total_revenue" in report
    assert "total_tax_collected" in report
    assert "total_discount_given" in report
    assert "bills" in report
    assert isinstance(report["bills"], list)

def test_gst_tax_summary_statutory_split(client, owner_headers):
    """
    Scenario 24 (STATUTORY GST AUDIT): Tax Summary & Central/State Split.
    Total GST must be divided 50% to CGST and 50% to SGST.
    """
    res = client.get("/api/v1/reports/tax-summary", headers=owner_headers)
    assert res.status_code == 200
    tax_data = res.json()
    assert "total_taxable_value" in tax_data
    assert "total_gst_collected" in tax_data
    assert "cgst_split" in tax_data
    assert "sgst_split" in tax_data

    # Statutory rule: CGST must equal SGST in intra-state transactions
    assert tax_data["cgst_split"] == tax_data["sgst_split"]
    assert round(tax_data["cgst_split"] + tax_data["sgst_split"], 2) == round(tax_data["total_gst_collected"], 2)

def test_schedule_drug_register_csv_export(client, owner_headers):
    """
    Scenario 25 (REGULATORY COMPLIANCE): Drug Inspector Statutory CSV Export.
    Streams an official CSV containing patient, doctor, and drug dispensation logs.
    """
    res = client.get("/api/v1/reports/export/schedule-register-csv", headers=owner_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment; filename=schedule_drug_register.csv" in res.headers.get("content-disposition", "")

    csv_text = res.text
    lines = csv_text.strip().splitlines()
    assert len(lines) >= 1

    header = lines[0]
    assert "Dispensed Date" in header
    assert "Patient Name" in header
    assert "Doctor ID" in header

def test_immutable_audit_logs(client, owner_headers):
    """Scenario 26: Immutable audit trail tracking critical store actions."""
    res = client.get("/api/v1/reports/audit-logs", headers=owner_headers)
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
    assert len(logs) > 0

    first_log = logs[0]
    assert "action" in first_log
    assert "entity" in first_log
    assert "created_at" in first_log
