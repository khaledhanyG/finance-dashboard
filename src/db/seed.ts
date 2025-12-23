import { db } from './index';
import { departments, employees, expenseGroups, expenseCategories, incomeServices, expenses } from './schema';
import * as dotenv from 'dotenv';
dotenv.config();

const main = async () => {
  console.log('Seeding database...');

  // 1. Departments
  const deptData = [
    { name: 'Operations' },
    { name: 'Sales' },
    { name: 'Marketing' },
    { name: 'Technology' },
    { name: 'HR' },
  ];
  const createdDepts = await db.insert(departments).values(deptData).returning();
  console.log(`Created ${createdDepts.length} departments`);

  // 2. Expense Groups
  const groupData = [
    { name: 'Operational Costs' },
    { name: 'Marketing & Sales' },
    { name: 'Personnel' },
    { name: 'Office & Supplies' },
  ];
  const createdGroups = await db.insert(expenseGroups).values(groupData).returning();
  console.log(`Created ${createdGroups.length} expense groups`);

  // 3. Expense Categories
  // Find group IDs
  const opGroup = createdGroups.find(g => g.name === 'Operational Costs')!;
  const mktGroup = createdGroups.find(g => g.name === 'Marketing & Sales')!;
  const persGroup = createdGroups.find(g => g.name === 'Personnel')!;
  const offGroup = createdGroups.find(g => g.name === 'Office & Supplies')!;

  const categoryData = [
    { name: 'Rent', groupId: opGroup.id },
    { name: 'Utilities', groupId: opGroup.id },
    { name: 'Online Ads', groupId: mktGroup.id },
    { name: 'Events', groupId: mktGroup.id },
    { name: 'Salaries', groupId: persGroup.id },
    { name: 'Stationery', groupId: offGroup.id },
  ];
  const createdCats = await db.insert(expenseCategories).values(categoryData).returning();
  console.log(`Created ${createdCats.length} expense categories`);

  // 4. Income Services
  const serviceData = [
    { name: 'Financial Consulting' },
    { name: 'Software Implementation' },
    { name: 'Audit Services' },
  ];
  await db.insert(incomeServices).values(serviceData);
  console.log('Created income services');

  // 5. Employees
  // Find dept IDs
  const opsDept = createdDepts.find(d => d.name === 'Operations')!;
  const salesDept = createdDepts.find(d => d.name === 'Sales')!;
  const techDept = createdDepts.find(d => d.name === 'Technology')!;

  const empData = [
    { name: 'Ahmed Al-Farsi', departmentId: opsDept.id, salary: '15000.00' },
    { name: 'Sara Khalid', departmentId: salesDept.id, salary: '12000.00' },
    { name: 'Mohammed Ali', departmentId: techDept.id, salary: '20000.00' },
  ];
  const createdEmps = await db.insert(employees).values(empData).returning();
  console.log(`Created ${createdEmps.length} employees`);

  // 6. Sample Expenses
  const rentCat = createdCats.find(c => c.name === 'Rent')!;
  const adsCat = createdCats.find(c => c.name === 'Online Ads')!;

  // Dates: today and a few days back
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const lastWeek = new Date(); lastWeek.setDate(today.getDate() - 7);

  const expenseData = [
    {
      journalNumber: 'J-001',
      date: today.toISOString().split('T')[0],
      amount: '5000.00',
      description: 'Monthly office rent',
      categoryId: rentCat.id,
      departmentId: opsDept.id,
      employeeId: null,
    },
    {
      journalNumber: 'J-002',
      date: yesterday.toISOString().split('T')[0],
      amount: '1200.00',
      description: 'Google Ads Campaign',
      categoryId: adsCat.id,
      departmentId: salesDept.id,
      employeeId: null,
    },
  ];
  await db.insert(expenses).values(expenseData);
  console.log('Created sample expenses');

  console.log('Seeding complete!');
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
