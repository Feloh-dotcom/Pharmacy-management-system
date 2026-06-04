# Supabase Integration Testing Guide

## Quick Start Testing

### 1. Verify System is Running

```bash
npm run dev
# Should see: "Express Server listening on port 5173"
```

### 2. Check Sync Status

```bash
curl http://localhost:5173/api/sync/status
```

Expected response:
```json
{
  "healthy": true,
  "message": "Sync health is good",
  "tables": {
    "medicines": { "local": 452, "cloud": 452, "match": true },
    "sales": { "local": 78, "cloud": 78, "match": true },
    "suppliers": { "local": 23, "cloud": 23, "match": true },
    ...
  }
}
```

---

## Test Scenarios

### Scenario 1: Create New Supplier

**Test Steps:**
1. Open UI and navigate to Suppliers
2. Click "Add Supplier"
3. Fill in:
   - Company Name: "Test Pharma Ltd"
   - Contact Person: "John Test"
   - Phone: "555-0123"
   - Email: "test@pharma.com"
4. Click Save

**Verification:**
```bash
# Should appear in local DB
curl http://localhost:5173/api/suppliers | grep "Test Pharma"

# Check it synced to Supabase (via dashboard or SQL)
SELECT * FROM suppliers WHERE company_name = 'Test Pharma Ltd';
```

**Expected Result:**
- Supplier appears in UI immediately
- Shows in `/api/suppliers` endpoint
- Exists in Supabase `suppliers` table
- No errors in server logs

---

### Scenario 2: Complete Sales Checkout

**Test Steps:**
1. Open Cash Register
2. Open New Register Session
3. Add medicines to cart:
   - Select 2 medicines
   - Set quantities (e.g., 5 units each)
4. Proceed to checkout
5. Select payment method
6. Complete transaction

**Verification:**
```bash
# Check sale in local DB
curl http://localhost:5173/api/sales | tail -1

# Check medicine quantities decreased
curl http://localhost:5173/api/medicines | jq '.[] | select(.name == "Aspirin") | .quantity'

# Check Supabase has the sale
SELECT * FROM sales ORDER BY sold_at DESC LIMIT 1;

# Check inventory logs exist
SELECT * FROM inventory_logs WHERE type = 'sale' ORDER BY created_at DESC LIMIT 5;
```

**Expected Result:**
- Sale invoice number generated (e.g., INV-2024-001)
- Sale appears with all items in `/api/sales`
- Sale exists in Supabase with items as JSONB array
- Medicine quantities decreased in both local DB and Supabase
- Inventory logs created for each medicine
- Finance record created for the transaction

**Sample Response:**
```json
{
  "id": "sal-1234567890",
  "invoiceNumber": "INV-2024-001",
  "customerId": "cust-123",
  "customerName": "John Doe",
  "items": [
    {
      "medicineId": "med-111",
      "medicineName": "Aspirin",
      "quantity": 5,
      "price": 50,
      "tax": 2.5
    }
  ],
  "totalPrice": 262.50,
  "paymentMethod": "Cash",
  "date": "2024-01-15T10:30:00Z"
}
```

---

### Scenario 3: Update Supplier Information

**Test Steps:**
1. Navigate to Suppliers
2. Click Edit on existing supplier
3. Change details (e.g., phone number)
4. Click Save

**Verification:**
```bash
# Check updated in local DB
curl http://localhost:5173/api/suppliers | grep "phone"

# Check Supabase updated
SELECT * FROM suppliers WHERE company_name = 'Existing Supplier';
```

**Expected Result:**
- Changes visible in UI immediately
- Updated in `/api/suppliers` endpoint
- Updated in Supabase `suppliers` table
- Audit log shows the modification

---

### Scenario 4: Create Purchase Order

**Test Steps:**
1. Navigate to Purchase Orders
2. Click "New Purchase Order"
3. Select supplier
4. Add items:
   - Select 3 medicines
   - Set order quantities
5. Click Save

**Verification:**
```bash
# Check in local DB
curl http://localhost:5173/api/purchase-orders | tail -1

# Check Supabase
SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT 1;

# Verify items are stored as JSONB
SELECT id, items FROM purchase_orders WHERE id = 'po-xxxxx';
```

**Expected Result:**
- PO created with unique ID
- Items stored as JSONB array in Supabase
- Total amount calculated correctly
- Status defaults to "Pending"

---

### Scenario 5: Test Sync Repair

**Test Steps:**
1. Run initial status check:
   ```bash
   curl http://localhost:5173/api/sync/status
   ```
2. Force repair:
   ```bash
   curl -X POST http://localhost:5173/api/sync/repair
   ```
3. Verify status again:
   ```bash
   curl http://localhost:5173/api/sync/status
   ```

**Expected Result:**
- Initial status shows current sync health
- Repair operation completes without errors
- All table counts remain consistent
- Final status shows "healthy"

---

### Scenario 6: Monitor Sync Logs

**Test Steps:**
1. Open server terminal
2. Perform an action (e.g., create supplier)
3. Observe server logs

**Expected Log Output:**
```
[Sync Debug] Supplier upsert: ID=sup-1234567890, Name=Test Pharma, Contact=John
[Sync] Upserting 1 records to suppliers...
[Sync] Successfully upserted 1 records to suppliers table
[Sync Complete] Upserts: 1, Deletes: 0, Duration: 145ms
```

---

## Comprehensive Test Checklist

### Data Creation Tests
- [ ] Create supplier → verify in Supabase
- [ ] Create customer → verify in Supabase
- [ ] Create medicine → verify in Supabase
- [ ] Create sale → verify in Supabase with items
- [ ] Create purchase order → verify in Supabase with items

### Data Update Tests
- [ ] Update supplier details → verify in Supabase
- [ ] Update medicine price → verify in Supabase
- [ ] Update customer info → verify in Supabase
- [ ] Update PO status → verify in Supabase
- [ ] Adjust sale items → verify in Supabase

### Data Delete Tests
- [ ] Delete supplier → verify removed from Supabase
- [ ] Delete medicine → verify removed from Supabase
- [ ] Reverse sale → verify removed from Supabase
- [ ] Delete customer → verify removed from Supabase

### Sync Verification Tests
- [ ] `/api/sync/status` shows all tables healthy
- [ ] `/api/sync/status` shows matching counts
- [ ] `/api/sync/force` completes without errors
- [ ] `/api/sync/repair` restores consistency

### End-to-End Flow Tests
- [ ] Complete cash register session → all data synced
- [ ] Multiple sales in one session → all visible in Supabase
- [ ] Supplier stock update → medicine quantities change
- [ ] Finance records created → appear in reports

### Error Handling Tests
- [ ] Invalid input rejected with error message
- [ ] Duplicate entries prevented
- [ ] Stock validation prevents overselling
- [ ] UI updates reflect Supabase state

### Performance Tests
- [ ] Single operation completes in <500ms
- [ ] Bulk operations (10+) complete in <2s
- [ ] Sync doesn't block UI
- [ ] Multiple concurrent requests handled properly

---

## Troubleshooting During Testing

### Issue: Sync Status Shows "Degraded"

**Steps to Fix:**
1. Check server logs for error messages
2. Run `/api/sync/repair` to auto-fix
3. Verify Supabase connection:
   ```bash
   # Check server logs for connection errors
   ```
4. If still failing, restart server

### Issue: Data Not Appearing in Supabase

**Steps to Fix:**
1. Verify service role key is correct
2. Check if table exists in Supabase
3. Verify Row Level Security (RLS) isn't blocking:
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM sales LIMIT 5;
   ```
4. Run manual sync:
   ```bash
   curl -X POST http://localhost:5173/api/sync/force
   ```

### Issue: Stale Data in UI

**Steps to Fix:**
1. Refresh browser (Cmd+R or Ctrl+R)
2. Close and reopen component
3. Force sync:
   ```bash
   curl -X POST http://localhost:5173/api/sync/force
   ```
4. If still stale, check browser console for errors

### Issue: Endpoint Returns 500 Error

**Steps to Fix:**
1. Check server logs for full error message
2. Verify request body format matches schema
3. Ensure user is authenticated
4. Check for database permission errors
5. Restart server if needed

---

## Performance Baselines

### Expected Response Times:

| Operation | Time | Notes |
|-----------|------|-------|
| Create supplier | 150-250ms | Includes sync |
| Create sale | 200-400ms | Includes multiple related records |
| Update medicine | 100-200ms | Single table update |
| Delete supplier | 150-250ms | Includes verification |
| Get all medicines | 50-100ms | No sync needed |
| Get all sales | 100-150ms | No sync needed |
| `/api/sync/status` | 200-400ms | Counts all tables |
| `/api/sync/force` | 500-2000ms | Full dataset sync |
| `/api/sync/repair` | 1-5 seconds | Depends on data size |

---

## Success Criteria

After completing these tests, the system is working correctly if:

✅ All endpoints respond without errors
✅ Data appears in Supabase within 500ms of creation
✅ Sync status always shows "healthy"
✅ Table row counts match between local and cloud
✅ No stale data visible in UI
✅ Audit logs track all changes
✅ Finance records accurately reflect transactions
✅ Inventory logs track all stock movements
✅ Complex operations (sales with multiple items) work correctly

---

## Next Steps

1. **Run Test Suite**: Execute all scenarios above in order
2. **Load Test**: Try with 100+ records to verify performance
3. **Concurrent Operations**: Test multiple users simultaneously
4. **Disaster Recovery**: Test data repair and sync recovery
5. **Production Deployment**: Follow deployment checklist

---

## Support

If you encounter issues:

1. Check server logs for detailed error messages
2. Run `/api/sync/status` to check sync health
3. Review ENDPOINT_STATUS_REPORT.md for expected behavior
4. Run `/api/sync/repair` to attempt auto-recovery
5. Check Supabase dashboard directly for data verification

---

**Testing Status**: Ready for live testing ✅
**Last Updated**: {{timestamp}}
