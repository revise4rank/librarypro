import { Pool } from "pg";
import { hashPassword } from "../src/lib/auth";

type SeedStudent = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  seatNumber: string;
  planName: string;
  planPrice: number;
  paymentStatus: "PAID" | "DUE" | "PENDING";
  dueAmount: number;
};

const seedStudents: SeedStudent[] = [
  {
    fullName: "Riya Sharma",
    email: "student@librarypro.demo",
    phone: "+919877766554",
    password: "student123",
    seatNumber: "A2",
    planName: "Monthly Premium",
    planPrice: 999,
    paymentStatus: "PAID",
    dueAmount: 0,
  },
  {
    fullName: "Aman Singh",
    email: "aman@librarypro.demo",
    phone: "+919877700111",
    password: "changeme123",
    seatNumber: "A3",
    planName: "Monthly Standard",
    planPrice: 799,
    paymentStatus: "DUE",
    dueAmount: 799,
  },
  {
    fullName: "Tanya Verma",
    email: "tanya@librarypro.demo",
    phone: "+919877700222",
    password: "changeme123",
    seatNumber: "A5",
    planName: "Monthly Premium",
    planPrice: 999,
    paymentStatus: "PAID",
    dueAmount: 0,
  },
  {
    fullName: "Dev Patel",
    email: "dev@librarypro.demo",
    phone: "+919877700333",
    password: "changeme123",
    seatNumber: "B1",
    planName: "Quarterly Saver",
    planPrice: 2499,
    paymentStatus: "PAID",
    dueAmount: 0,
  },
  {
    fullName: "Priya Joshi",
    email: "priya@librarypro.demo",
    phone: "+919877700444",
    password: "changeme123",
    seatNumber: "B3",
    planName: "Monthly Premium",
    planPrice: 999,
    paymentStatus: "DUE",
    dueAmount: 999,
  },
];

async function upsertUser(pool: Pool, input: {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: "LIBRARY_OWNER" | "STUDENT" | "SUPER_ADMIN";
}) {
  const result = await pool.query<{ id: string }>(
    `
    INSERT INTO users (full_name, email, phone, password_hash, global_role)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        password_hash = EXCLUDED.password_hash,
        global_role = EXCLUDED.global_role,
        updated_at = NOW()
    RETURNING id
    `,
    [input.fullName, input.email, input.phone, input.passwordHash, input.role],
  );

  return result.rows[0].id;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString });

  try {
    await pool.query("BEGIN");
    const seededAssignments: Array<{
      studentId: string;
      assignmentId: string;
      seatId: string | null;
      seatNumber: string;
    }> = [];

    const ownerId = await upsertUser(pool, {
      fullName: "Vikram Jain",
      email: "owner@librarypro.demo",
      phone: "+919988711223",
      passwordHash: await hashPassword("owner123"),
      role: "LIBRARY_OWNER",
    });

    const adminId = await upsertUser(pool, {
      fullName: "Platform Admin",
      email: "admin@librarypro.demo",
      phone: "+919911122233",
      passwordHash: await hashPassword("admin123"),
      role: "SUPER_ADMIN",
    });

    const secondOwnerId = await upsertUser(pool, {
      fullName: "Megha Soni",
      email: "owner2@librarypro.demo",
      phone: "+919900110022",
      passwordHash: await hashPassword("owner123"),
      role: "LIBRARY_OWNER",
    });

    const libraryResult = await pool.query<{ id: string }>(
      `
      INSERT INTO libraries (
        owner_user_id, name, slug, city, area, address, latitude, longitude,
        total_seats, available_seats, starting_price, offer_text, qr_secret_hash
      )
      VALUES (
        $1, 'Focus Library', 'focus-library', 'Indore', 'Vijay Nagar',
        'Plot 21, Sector B, Vijay Nagar, Indore', 22.753284, 75.893696,
        12, 7, 799, 'First week free', 'demo-secret-hash'
      )
      ON CONFLICT (slug) DO UPDATE
      SET owner_user_id = EXCLUDED.owner_user_id,
          name = EXCLUDED.name,
          city = EXCLUDED.city,
          area = EXCLUDED.area,
          address = EXCLUDED.address,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          starting_price = EXCLUDED.starting_price,
          offer_text = EXCLUDED.offer_text,
          updated_at = NOW()
      RETURNING id
      `,
      [ownerId],
    );
    const libraryId = libraryResult.rows[0].id;

    await pool.query(
      `
      INSERT INTO user_library_roles (user_id, library_id, role)
      VALUES ($1, $2, 'LIBRARY_OWNER')
      ON CONFLICT (user_id, library_id, role) DO NOTHING
      `,
      [ownerId, libraryId],
    );

    await pool.query(
      `
      INSERT INTO subscriptions (
        library_id, plan_code, plan_name, amount, status,
        current_period_start, current_period_end, renews_at
      )
      VALUES (
        $1, 'GROWTH_999', 'Growth 999', 999, 'ACTIVE',
        NOW(), NOW() + INTERVAL '30 days', NOW() + INTERVAL '30 days'
      )
      ON CONFLICT (library_id) DO UPDATE
      SET plan_code = EXCLUDED.plan_code,
          plan_name = EXCLUDED.plan_name,
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          current_period_start = EXCLUDED.current_period_start,
          current_period_end = EXCLUDED.current_period_end,
          renews_at = EXCLUDED.renews_at,
          updated_at = NOW()
      `,
      [libraryId],
    );

    await pool.query(
      `
      INSERT INTO libraries_public_profiles (
        library_id, subdomain, hero_title, hero_tagline, about_text, contact_name,
        contact_phone, whatsapp_phone, address_text, latitude, longitude, landmark,
        business_hours, amenities, gallery_images, seo_title, seo_description,
        is_published, show_in_marketplace, allow_direct_contact, ad_budget, highlight_offer, published_at
      )
      VALUES (
        $1, 'focuslibrary',
        'Serious study environment for aspirants who want silence, discipline, and reliable seating.',
        'AC reading hall, flexible plans, QR entry, girls-only zone, and real-time seat visibility.',
        'Focus Library is designed for serious aspirants preparing for competitive and academic exams.',
        'Vikram Jain',
        '+919988711223',
        '+919988711223',
        'Plot 21, Sector B, Vijay Nagar, Indore',
        22.753284,
        75.893696,
        'Near Vijay Nagar Square',
        '6:00 AM - 11:00 PM',
        '["AC","WiFi","Girls Only Zone","QR Entry","Power Backup"]'::jsonb,
        '["/uploads/public-profiles/demo-1.jpg","/uploads/public-profiles/demo-2.jpg"]'::jsonb,
        'Focus Library Vijay Nagar Indore | AC Study Hall | LibraryPro',
        'Affordable silent reading hall in Vijay Nagar with flexible plans, QR entry, and real-time seat availability.',
        TRUE, TRUE, TRUE, 3500, 'Free trial day + first week discount', NOW()
      )
      ON CONFLICT (library_id) DO UPDATE
      SET subdomain = EXCLUDED.subdomain,
          hero_title = EXCLUDED.hero_title,
          hero_tagline = EXCLUDED.hero_tagline,
          about_text = EXCLUDED.about_text,
          contact_name = EXCLUDED.contact_name,
          contact_phone = EXCLUDED.contact_phone,
          whatsapp_phone = EXCLUDED.whatsapp_phone,
          address_text = EXCLUDED.address_text,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          landmark = EXCLUDED.landmark,
          business_hours = EXCLUDED.business_hours,
          amenities = EXCLUDED.amenities,
          gallery_images = EXCLUDED.gallery_images,
          seo_title = EXCLUDED.seo_title,
          seo_description = EXCLUDED.seo_description,
          is_published = EXCLUDED.is_published,
          show_in_marketplace = EXCLUDED.show_in_marketplace,
          allow_direct_contact = EXCLUDED.allow_direct_contact,
          ad_budget = EXCLUDED.ad_budget,
          highlight_offer = EXCLUDED.highlight_offer,
          published_at = EXCLUDED.published_at,
          updated_at = NOW()
      `,
      [libraryId],
    );

    await pool.query(
      `
      INSERT INTO library_settings (library_id, wifi_name, wifi_password, notice_message)
      VALUES (
        $1,
        'LibraryPro_StudyZone',
        'study@2026',
        'Silence hours from 8 PM to 10 PM. Carry your ID card and use QR check-in during entry and exit.'
      )
      ON CONFLICT (library_id) DO UPDATE
      SET wifi_name = EXCLUDED.wifi_name,
          wifi_password = EXCLUDED.wifi_password,
          notice_message = EXCLUDED.notice_message,
          updated_at = NOW()
      `,
      [libraryId],
    );

    await pool.query(`DELETE FROM notifications WHERE library_id = $1`, [libraryId]);
    await pool.query(`DELETE FROM payments WHERE library_id = $1`, [libraryId]);
    await pool.query(`DELETE FROM expenses WHERE library_id = $1`, [libraryId]);
    await pool.query(`DELETE FROM platform_payments WHERE library_id = $1`, [libraryId]);
    await pool.query(`DELETE FROM checkins WHERE library_id = $1`, [libraryId]);
    await pool.query(`DELETE FROM student_assignments WHERE library_id = $1`, [libraryId]);
    await pool.query(`DELETE FROM seats WHERE library_id = $1`, [libraryId]);
    await pool.query(`DELETE FROM library_floors WHERE library_id = $1`, [libraryId]);

    const groundFloor = await pool.query<{ id: string }>(
      `
      INSERT INTO library_floors (library_id, name, floor_number, layout_columns, layout_rows)
      VALUES ($1, 'Ground Floor', 0, 6, 2)
      RETURNING id
      `,
      [libraryId],
    );
    const firstFloor = await pool.query<{ id: string }>(
      `
      INSERT INTO library_floors (library_id, name, floor_number, layout_columns, layout_rows)
      VALUES ($1, 'First Floor', 1, 6, 2)
      RETURNING id
      `,
      [libraryId],
    );

    const seatPlan = [
      { floorId: groundFloor.rows[0].id, floor: "A", row: 1, seats: ["A1", "A2", "A3", "A4", "A5", "A6"] },
      { floorId: groundFloor.rows[0].id, floor: "B", row: 2, seats: ["B1", "B2", "B3", "B4", "B5", "B6"] },
    ];

    for (const row of seatPlan) {
      for (const [index, seatNumber] of row.seats.entries()) {
        const floorId = seatNumber.startsWith("A") ? groundFloor.rows[0].id : firstFloor.rows[0].id;
        const rowNo = seatNumber.startsWith("A") || seatNumber.startsWith("C") ? 1 : 2;
        const seatResult = await pool.query<{ id: string }>(
          `
          INSERT INTO seats (
            library_id, floor_id, seat_number, label, row_no, col_no, pos_x, pos_y, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'AVAILABLE')
          RETURNING id
          `,
          [libraryId, floorId, seatNumber, seatNumber, rowNo, index + 1, index + 1, rowNo],
        );
        void seatResult;
      }
    }

    const allSeatRows = await pool.query<{ id: string; seat_number: string }>(
      `SELECT id, seat_number FROM seats WHERE library_id = $1`,
      [libraryId],
    );
    const seatMap = new Map(allSeatRows.rows.map((row) => [row.seat_number, row.id]));

    for (const studentSeed of seedStudents) {
      const studentId = await upsertUser(pool, {
        fullName: studentSeed.fullName,
        email: studentSeed.email,
        phone: studentSeed.phone,
        passwordHash: await hashPassword(studentSeed.password),
        role: "STUDENT",
      });

      await pool.query(
        `
        INSERT INTO user_library_roles (user_id, library_id, role)
        VALUES ($1, $2, 'STUDENT')
        ON CONFLICT (user_id, library_id, role) DO NOTHING
        `,
        [studentId, libraryId],
      );

      const seatId = seatMap.get(studentSeed.seatNumber) ?? null;
      const assignment = await pool.query<{ id: string }>(
        `
        INSERT INTO student_assignments (
          library_id, student_user_id, seat_id, plan_name, plan_price,
          starts_at, ends_at, status, payment_status, assigned_by, notes
        )
        VALUES (
          $1, $2, $3, $4, $5,
          NOW() - INTERVAL '3 days', NOW() + INTERVAL '30 days', 'ACTIVE', $6, $7, 'Seeded demo assignment'
        )
        RETURNING id
        `,
        [libraryId, studentId, seatId, studentSeed.planName, studentSeed.planPrice, studentSeed.paymentStatus, ownerId],
      );

      if (seatId) {
        await pool.query(`UPDATE seats SET status = 'OCCUPIED', updated_at = NOW() WHERE id = $1`, [seatId]);
      }

      seededAssignments.push({
        studentId,
        assignmentId: assignment.rows[0].id,
        seatId,
        seatNumber: studentSeed.seatNumber,
      });

      await pool.query(
        `
        INSERT INTO payments (
          library_id, student_user_id, assignment_id, amount, currency, status, method,
          paid_at, due_date, reference_no, notes, created_by
        )
        VALUES (
          $1, $2, $3, $4, 'INR', $5, $6,
          $7, $8, $9, $10, $11
        )
        `,
        [
          libraryId,
          studentId,
          assignment.rows[0].id,
          studentSeed.dueAmount === 0 ? studentSeed.planPrice : studentSeed.dueAmount,
          studentSeed.paymentStatus,
          studentSeed.paymentStatus === "PAID" ? "UPI" : "Cash",
          studentSeed.paymentStatus === "PAID" ? new Date().toISOString() : null,
          studentSeed.paymentStatus === "PAID" ? null : new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
          `SEED-${studentSeed.seatNumber}`,
          "Seeded demo payment",
          ownerId,
        ],
      );

      await pool.query(
        `
        INSERT INTO notifications (
          library_id, sender_user_id, recipient_user_id, type, title, message, delivered_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, NOW()
        )
        `,
        [
          libraryId,
          ownerId,
          studentId,
          studentSeed.paymentStatus === "DUE" ? "PAYMENT_REMINDER" : "GENERAL",
          studentSeed.paymentStatus === "DUE" ? "Pending dues reminder" : "Welcome to Focus Library",
          studentSeed.paymentStatus === "DUE"
            ? `Hi ${studentSeed.fullName}, your library fee is due. Please clear it to avoid interruption.`
            : `Hi ${studentSeed.fullName}, your seat ${studentSeed.seatNumber} is active and ready.`,
        ],
      );
    }

    await pool.query(
      `
      UPDATE seats
      SET status = 'DISABLED', updated_at = NOW()
      WHERE library_id = $1 AND seat_number = 'A4'
      `,
      [libraryId],
    );
    await pool.query(
      `
      UPDATE seats
      SET status = 'RESERVED', updated_at = NOW()
      WHERE library_id = $1 AND seat_number = 'B5'
      `,
      [libraryId],
    );

    await pool.query(
      `
      INSERT INTO platform_payments (library_id, amount, status, razorpay_order_id, razorpay_payment_id, paid_at)
      VALUES
        ($1, 999, 'PAID', 'order_demo_focus_001', 'pay_demo_focus_001', NOW() - INTERVAL '2 days'),
        ($1, 999, 'PAID', 'order_demo_focus_002', 'pay_demo_focus_002', NOW() - INTERVAL '15 days')
      `,
      [libraryId],
    );

    await pool.query(
      `
      INSERT INTO expenses (library_id, category, title, amount, spent_on, notes, created_by)
      VALUES
        ($1, 'Rent', 'Monthly rent', 18000, CURRENT_DATE - 10, 'Main property rent', $2),
        ($1, 'Electricity', 'Power and AC bill', 4200, CURRENT_DATE - 6, 'Peak exam month usage', $2),
        ($1, 'Internet', 'WiFi lease line', 1800, CURRENT_DATE - 4, 'Fiber connection', $2),
        ($1, 'Staff', 'Reception and cleaning support', 6500, CURRENT_DATE - 2, 'Support staff payout', $2)
      `,
      [libraryId, ownerId],
    );

    for (const [index, assignment] of seededAssignments.slice(0, 4).entries()) {
      const checkInAt = new Date(Date.now() - (index + 1) * 86400000 + 9 * 60 * 60 * 1000);
      const checkOutAt = new Date(checkInAt.getTime() + (4 + index) * 60 * 60 * 1000);
      await pool.query(
        `
        INSERT INTO checkins (
          library_id, student_user_id, assignment_id, seat_id, mode, client_event_id,
          checked_in_at, checked_out_at, device_time, qr_key_id
        )
        VALUES (
          $1, $2, $3, $4, 'QR', gen_random_uuid(),
          $5, $6, $5, gen_random_uuid()
        )
        `,
        [libraryId, assignment.studentId, assignment.assignmentId, assignment.seatId, checkInAt.toISOString(), checkOutAt.toISOString()],
      );
    }

    const secondLibraryResult = await pool.query<{ id: string }>(
      `
      INSERT INTO libraries (
        owner_user_id, name, slug, city, area, address, latitude, longitude,
        total_seats, available_seats, starting_price, offer_text, qr_secret_hash
      )
      VALUES (
        $1, 'Prime Study Zone', 'prime-study-zone', 'Bhopal', 'MP Nagar',
        'Plot 7, MP Nagar, Bhopal', 23.233076, 77.434258,
        24, 10, 699, 'First 2 days free for new students', 'demo-secret-hash-two'
      )
      ON CONFLICT (slug) DO UPDATE
      SET owner_user_id = EXCLUDED.owner_user_id,
          name = EXCLUDED.name,
          city = EXCLUDED.city,
          area = EXCLUDED.area,
          address = EXCLUDED.address,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          total_seats = EXCLUDED.total_seats,
          available_seats = EXCLUDED.available_seats,
          starting_price = EXCLUDED.starting_price,
          offer_text = EXCLUDED.offer_text,
          status = 'ACTIVE',
          updated_at = NOW()
      RETURNING id
      `,
      [secondOwnerId],
    );
    const secondLibraryId = secondLibraryResult.rows[0].id;

    await pool.query(
      `
      INSERT INTO user_library_roles (user_id, library_id, role)
      VALUES ($1, $2, 'LIBRARY_OWNER')
      ON CONFLICT (user_id, library_id, role) DO NOTHING
      `,
      [secondOwnerId, secondLibraryId],
    );

    await pool.query(
      `
      INSERT INTO subscriptions (
        library_id, plan_code, plan_name, amount, status,
        current_period_start, current_period_end, renews_at
      )
      VALUES (
        $1, 'STARTER_499', 'Starter 499', 499, 'ACTIVE',
        NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days', NOW() + INTERVAL '27 days'
      )
      ON CONFLICT (library_id) DO UPDATE
      SET plan_code = EXCLUDED.plan_code,
          plan_name = EXCLUDED.plan_name,
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          current_period_start = EXCLUDED.current_period_start,
          current_period_end = EXCLUDED.current_period_end,
          renews_at = EXCLUDED.renews_at,
          updated_at = NOW()
      `,
      [secondLibraryId],
    );

    await pool.query(
      `
      INSERT INTO libraries_public_profiles (
        library_id, subdomain, hero_title, hero_tagline, about_text, contact_name,
        contact_phone, whatsapp_phone, address_text, latitude, longitude, landmark,
        business_hours, amenities, gallery_images, seo_title, seo_description,
        is_published, show_in_marketplace, allow_direct_contact, ad_budget, highlight_offer, published_at
      )
      VALUES (
        $1, 'primestudyzone',
        'Focused silent study hall near MP Nagar with flexible monthly plans.',
        'Budget-friendly library with AC, WiFi, and dedicated exam prep seating.',
        'Prime Study Zone helps city students discover affordable serious seating with owner-managed support.',
        'Megha Soni',
        '+919900110022',
        '+919900110022',
        'Plot 7, MP Nagar, Bhopal',
        23.233076,
        77.434258,
        'Near MP Nagar Metro',
        '7:00 AM - 10:00 PM',
        '["AC","WiFi","Power Backup","Locker"]'::jsonb,
        '["/uploads/public-profiles/demo-3.jpg"]'::jsonb,
        'Prime Study Zone MP Nagar Bhopal | Budget Reading Hall',
        'Affordable study hall in MP Nagar with QR entry and flexible library plans.',
        TRUE, TRUE, TRUE, 1200, '2-seat combo discount', NOW()
      )
      ON CONFLICT (library_id) DO UPDATE
      SET subdomain = EXCLUDED.subdomain,
          hero_title = EXCLUDED.hero_title,
          hero_tagline = EXCLUDED.hero_tagline,
          about_text = EXCLUDED.about_text,
          contact_name = EXCLUDED.contact_name,
          contact_phone = EXCLUDED.contact_phone,
          whatsapp_phone = EXCLUDED.whatsapp_phone,
          address_text = EXCLUDED.address_text,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          landmark = EXCLUDED.landmark,
          business_hours = EXCLUDED.business_hours,
          amenities = EXCLUDED.amenities,
          gallery_images = EXCLUDED.gallery_images,
          seo_title = EXCLUDED.seo_title,
          seo_description = EXCLUDED.seo_description,
          is_published = EXCLUDED.is_published,
          show_in_marketplace = EXCLUDED.show_in_marketplace,
          allow_direct_contact = EXCLUDED.allow_direct_contact,
          ad_budget = EXCLUDED.ad_budget,
          highlight_offer = EXCLUDED.highlight_offer,
          published_at = EXCLUDED.published_at,
          updated_at = NOW()
      `,
      [secondLibraryId],
    );

    await pool.query(
      `
      INSERT INTO library_settings (library_id, wifi_name, wifi_password, notice_message)
      VALUES (
        $1,
        'Prime_Study_WiFi',
        'prime@2026',
        'Library closes at 10 PM. Keep QR ready during entry and exit.'
      )
      ON CONFLICT (library_id) DO UPDATE
      SET wifi_name = EXCLUDED.wifi_name,
          wifi_password = EXCLUDED.wifi_password,
          notice_message = EXCLUDED.notice_message,
          updated_at = NOW()
      `,
      [secondLibraryId],
    );

    await pool.query(`DELETE FROM platform_payments WHERE library_id = $1`, [secondLibraryId]);
    await pool.query(
      `
      INSERT INTO platform_payments (library_id, amount, status, razorpay_order_id, razorpay_payment_id, paid_at)
      VALUES ($1, 499, 'PAID', 'order_demo_prime_001', 'pay_demo_prime_001', NOW() - INTERVAL '1 day')
      `,
      [secondLibraryId],
    );

    await pool.query(
      `
      UPDATE libraries
      SET
        total_seats = (SELECT COUNT(*) FROM seats WHERE library_id = $1),
        available_seats = (SELECT COUNT(*) FROM seats WHERE library_id = $1 AND status = 'AVAILABLE'),
        updated_at = NOW()
      WHERE id = $1
      `,
      [libraryId],
    );

    await pool.query("COMMIT");

    console.info("Demo seed complete with floors, seats, assignments, payments, and notifications.");
    console.info("Owner login: owner@librarypro.demo / owner123");
    console.info("Student login: student@librarypro.demo / student123");
    console.info("Admin login: admin@librarypro.demo / admin123");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
