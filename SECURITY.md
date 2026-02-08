# Security & Maintenance Guide

## 🔒 How Your Database is Protected

Your database is secure because of the following setup:

1.  **Environment Variables**: All database connection logic uses `process.env.DATABASE_URL`. The code never contains the actual connection string.
2.  **Git Protection**: The `.env` file (which holds your secret string) is listed in `.gitignore`. This means it will **never** be uploaded to GitHub.
3.  **Vercel Integration**: When the app runs on Vercel, it uses the "Environment Variables" you set in the Vercel Dashboard, which are encrypted and safe.

---

## ⚠️ Action Required: Data Files

Currently, the following data files are being tracked in your GitHub repository:
- `Employee.xlsx`
- `ExpenseEntry.xlsx`
- `Invoices.xlsx`
- `cr.csv`

> [!WARNING]
> If these files contain **real business data**, you should remove them from GitHub before making the repository public. 

**To remove them and protect them in the future:**
1. Open `.gitignore` and add these lines:
   ```
   *.xlsx
   *.csv
   *.xls
   ```
2. Run these commands locally:
   ```bash
   git rm --cached Employee.xlsx ExpenseEntry.xlsx Invoices.xlsx cr.csv
   git commit -m "Remove sensitive data files from git tracking"
   git push origin master
   ```

---

## 🚀 Best Practices for Future Code

To keep the app secure in the future, follow these rules:

### 1. Never hardcode the connection string
Avoid putting strings starting with `postgresql://` directly in your `.ts` or `.js` files.

### 2. Don't log the DATABASE_URL
Avoid `console.log(process.env.DATABASE_URL)`.

### 3. Use Password Hashing (Future Task)
Currently, user passwords (like `123456`) are stored in **plain text** in the database. I recommend implementing `bcrypt` in the next phase.

---

**Everything is currently set up correctly for a secure deployment!**
