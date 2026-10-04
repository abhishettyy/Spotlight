import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL in .env");
  process.exit(1);
}

const pool = new Pool({ connectionString });

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  const str = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${str}'`;
}

async function exportData() {
  console.log("Connecting to PostgreSQL...");
  const client = await pool.connect();
  console.log("Connected successfully. Exporting tables...");

  const outLines: string[] = [
    '-- Spotlight Data Export from PostgreSQL to MySQL',
    '-- Generated at: ' + new Date().toISOString(),
    'SET FOREIGN_KEY_CHECKS = 0;\n',
  ];

  const tables = [
    { name: 'Club', query: 'SELECT * FROM "Club"' },
    { name: 'Profile', query: 'SELECT * FROM "Profile"' },
    { name: 'Event', query: 'SELECT * FROM "Event"' },
    { name: 'Team', query: 'SELECT * FROM "Team"' },
    { name: 'Registration', query: 'SELECT * FROM "Registration"' },
    { name: 'Notification', query: 'SELECT * FROM "Notification"' },
    { name: 'RegistrationKey', query: 'SELECT * FROM "RegistrationKey"' },
  ];

  for (const t of tables) {
    try {
      const res = await client.query(t.query);
      console.log(`Exporting table ${t.name}: ${res.rows.length} rows`);

      if (res.rows.length > 0) {
        outLines.push(`-- Table: ${t.name}`);
        for (const row of res.rows) {
          const cols: string[] = [];
          const vals: string[] = [];

          for (const [key, val] of Object.entries(row)) {
            // Convert camelCase or quoted columns to snake_case if needed by schema
            let colName = key;
            if (key === 'logoUrl') colName = 'logo_url';
            else if (key === 'qrUrl') colName = 'qr_url';
            else if (key === 'upiId') colName = 'upi_id';
            else if (key === 'fullName') colName = 'full_name';
            else if (key === 'clubId') colName = 'club_id';
            else if (key === 'eventType') colName = 'event_type';
            else if (key === 'registrationLimit') colName = 'registration_limit';
            else if (key === 'registrationDeadline') colName = 'registration_deadline';
            else if (key === 'eventDate') colName = 'event_date';
            else if (key === 'bannerUrl') colName = 'banner_url';
            else if (key === 'teamSizeLimit') colName = 'team_size_limit';
            else if (key === 'minTeamSize') colName = 'min_team_size';
            else if (key === 'eventEndDate') colName = 'event_end_date';
            else if (key === 'teamName') colName = 'team_name';
            else if (key === 'leaderId') colName = 'leader_id';
            else if (key === 'eventId') colName = 'event_id';
            else if (key === 'userId') colName = 'user_id';
            else if (key === 'teamId') colName = 'team_id';
            else if (key === 'paymentProofUrl') colName = 'payment_proof_url';
            else if (key === 'createdAt') colName = 'created_at';
            else if (key === 'transactionId') colName = 'transaction_id';
            else if (key === 'checkedInAt') colName = 'checked_in_at';
            else if (key === 'isRead') colName = 'is_read';
            else if (key === 'isUsed') colName = 'is_used';
            else if (key === 'usedByClubId') colName = 'used_by_club_id';
            else if (key === 'usedAt') colName = 'used_at';

            cols.push(`\`${colName}\``);
            vals.push(escapeSql(val));
          }

          outLines.push(`INSERT INTO \`${t.name}\` (${cols.join(', ')}) VALUES (${vals.join(', ')});`);
        }
        outLines.push('');
      }
    } catch (err: any) {
      console.warn(`Could not export table ${t.name}:`, err.message);
    }
  }

  outLines.push('SET FOREIGN_KEY_CHECKS = 1;\n');

  const outPath = path.join(__dirname, 'prisma', 'mysql_data_export.sql');
  fs.writeFileSync(outPath, outLines.join('\n'), 'utf8');
  console.log(`\nExport successfully written to: ${outPath}`);

  client.release();
  await pool.end();
}

exportData().catch((err) => {
  console.error("Export error:", err);
  process.exit(1);
});
