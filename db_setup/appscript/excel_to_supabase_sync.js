/******** CONFIG ********/
const SUPABASE_URL = "https://ywywmoihhzrqelcsuxfn.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3eXdtb2loaHpycWVsY3N1eGZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ0NDQwMSwiZXhwIjoyMDcyMDIwNDAxfQ.TTEsUDT8xQpLLlfoKWPenFN_qYxHNvQLX3a8xPXcWpg";

/******** MAIN SYNC FUNCTION ********/
function supabaseSync() {
  const dbDepartments = fetchDepartments();
  const dbEmployees = fetchEmployees();

  const sheetDepts = getDepartmentsFromSheet();
  const sheetEmps = getEmployeesFromSheet(sheetDepts);

  Logger.log("=== SYNC START ===");
  Logger.log(
    `Departments -> DB: ${dbDepartments.length}, Sheet: ${Object.keys(sheetDepts).length}`
  );
  Logger.log(
    `Employees   -> DB: ${dbEmployees.length}, Sheet: ${sheetEmps.length}`
  );

  syncDepartments(sheetDepts, dbDepartments);
  syncEmployees(sheetEmps, dbEmployees, dbDepartments);

  Logger.log("=== SYNC END ===");
}

/******** HELPERS TO READ SHEETS ********/
function getDepartmentsFromSheet() {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("HeadMapping");
  const data = sheet.getDataRange().getValues();
  data.shift(); // remove header

  const departments = {};
  data.forEach((row) => {
    const [team, leader, leaderEmail] = row;
    if (team && leaderEmail) {
      departments[team] = { name: team, leader_email: leaderEmail };
    }
  });
  return departments;
}

function getEmployeesFromSheet() {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("EmployeeMapping");
  const data = sheet.getDataRange().getValues();
  data.shift(); // remove header

  return data.map((row) => {
    const [name, email, deptName] = row;
    return { emp_name: name, emp_email: email, department: deptName };
  });
}

/******** SYNC DEPARTMENTS ********/
function syncDepartments(sheetDepts, dbDepts) {
  let inserted = 0,
    updated = 0,
    deleted = 0;

  // Insert/update
  for (const deptName in sheetDepts) {
    const dept = sheetDepts[deptName];
    const match = dbDepts.find((d) => d.name === deptName);

    if (!match) {
      callSupabase("departments", "POST", dept);
      Logger.log(`Inserted Department: ${deptName}`);
      inserted++;
    } else if (match.leader_email !== dept.leader_email) {
      callSupabase("departments?id=eq." + match.id, "PATCH", {
        leader_email: dept.leader_email,
      });
      Logger.log(
        `Updated Department: ${deptName} (Leader changed to ${dept.leader_email})`
      );
      updated++;
    }
  }

  // Delete missing
  dbDepts.forEach((d) => {
    if (!sheetDepts[d.name]) {
      callSupabase("departments?id=eq." + d.id, "DELETE");
      Logger.log(`Deleted Department: ${d.name}`);
      deleted++;
    }
  });

  Logger.log(
    `Departments Sync Summary -> Inserted: ${inserted}, Updated: ${updated}, Deleted: ${deleted}`
  );
}

/******** SYNC EMPLOYEES ********/
function syncEmployees(sheetEmps, dbEmps, dbDepartments) {
  let inserted = 0,
    updated = 0,
    deleted = 0;

  sheetEmps.forEach((emp) => {
    const deptRow = dbDepartments.find((d) => d.name === emp.department);
    if (!deptRow) {
      Logger.log(
        `Skipped Employee: ${emp.emp_name} (${emp.emp_email}) — Dept not found`
      );
      return; // skip if dept missing
    }

    const match = dbEmps.find((e) => e.emp_email === emp.emp_email);
    if (!match) {
      callSupabase("employee_department", "POST", {
        emp_name: emp.emp_name,
        emp_email: emp.emp_email,
        department_id: deptRow.id,
      });
      Logger.log(`Inserted Employee: ${emp.emp_name} (${emp.emp_email})`);
      inserted++;
    } else {
      if (
        match.emp_name !== emp.emp_name ||
        match.department_id !== deptRow.id
      ) {
        callSupabase("employee_department?id=eq." + match.id, "PATCH", {
          emp_name: emp.emp_name,
          department_id: deptRow.id,
        });
        Logger.log(`Updated Employee: ${emp.emp_name} (${emp.emp_email})`);
        updated++;
      }
    }
  });

  // Delete employees missing in sheet
  dbEmps.forEach((e) => {
    const exists = sheetEmps.find((se) => se.emp_email === e.emp_email);
    if (!exists) {
      callSupabase("employee_department?id=eq." + e.id, "DELETE");
      Logger.log(`Deleted Employee: ${e.emp_name} (${e.emp_email})`);
      deleted++;
    }
  });

  Logger.log(
    `Employees Sync Summary -> Inserted: ${inserted}, Updated: ${updated}, Deleted: ${deleted}`
  );
}

/******** SUPABASE API HELPERS ********/
function fetchDepartments() {
  return callSupabase("departments", "GET") || [];
}

function fetchEmployees() {
  return callSupabase("employee_department", "GET") || [];
}

function callSupabase(endpoint, method, body) {
  const options = {
    method: method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
    },
  };
  if (body) options.payload = JSON.stringify(body);

  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const res = UrlFetchApp.fetch(url, options);
  try {
    return JSON.parse(res.getContentText());
  } catch (e) {
    return null;
  }
}
