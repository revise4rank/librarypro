ALTER TABLE platform_integration_settings
  ADD COLUMN IF NOT EXISTS support_whatsapp_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS demo_whatsapp_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS support_whatsapp_message TEXT NOT NULL DEFAULT 'Hi BookLib, I need support.',
  ADD COLUMN IF NOT EXISTS demo_whatsapp_message TEXT NOT NULL DEFAULT 'Hi BookLib, I want a demo for my library.',
  ADD COLUMN IF NOT EXISTS enable_floating_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS enable_book_demo_cta BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Library Growth',
  excerpt TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  read_time_minutes INTEGER NOT NULL DEFAULT 6,
  content_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blog_posts_status_chk CHECK (status IN ('DRAFT', 'PUBLISHED'))
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_public
  ON blog_posts(status, is_archived, published_at DESC);

INSERT INTO blog_posts (
  title, slug, category, excerpt, cover_image_url, seo_title, seo_description,
  read_time_minutes, content_json, status, published_at
) VALUES
(
  'Best Library Management Software for Reading Rooms in India',
  'best-library-management-software-reading-rooms-india',
  'Library Management',
  'A practical guide for reading room owners who want admissions, seat control, dues, attendance, and public discovery in one clean system.',
  '',
  'Best Library Management Software for Reading Rooms in India',
  'Compare the features a serious Indian reading room needs: seats, QR attendance, dues, student portal, marketplace listing, and reports.',
  8,
  '[
    {"type":"heading","text":"What a modern reading room really needs"},
    {"type":"paragraph","text":"A study library is not just a room full of desks. Owners need to onboard students, track plans and dues, manage seats, maintain discipline, and keep enquiries coming in. Good software should reduce desk work instead of adding another confusing screen."},
    {"type":"list","items":["Visual seat map with free, occupied, reserved, and blocked seats","Admissions and roster flow before seat allotment","QR attendance for entry and exit","Student portal for dues, notices, and study continuity","Marketplace listing and branded website for discovery"]},
    {"type":"heading","text":"Where BookLib fits"},
    {"type":"paragraph","text":"BookLib combines owner operations with growth tools. Owners can manage the daily roster, payments, check-ins, plans, coupons, listing, and public subdomain from one platform, while students get a simple portal for access and updates."},
    {"type":"cta","title":"Want to see the owner flow?","text":"Book a quick demo and see how the library journey works from admission to attendance."}
  ]'::jsonb,
  'PUBLISHED',
  NOW() - INTERVAL '5 days'
),
(
  'How QR Attendance Helps Study Libraries Reduce Manual Work',
  'qr-attendance-study-library-manual-work',
  'Attendance',
  'QR check-in and checkout can make attendance cleaner, faster, and easier to audit for owners and staff.',
  '',
  'QR Attendance for Study Libraries',
  'Learn how QR attendance helps reading rooms track entry, exit, overstay, and daily student activity without manual registers.',
  6,
  '[
    {"type":"heading","text":"The manual register problem"},
    {"type":"paragraph","text":"Paper registers look simple, but they become difficult when the owner wants daily duration, inside-now status, or old attendance history. Staff also loses time searching names and correcting handwriting mistakes."},
    {"type":"heading","text":"A single QR can handle daily flow"},
    {"type":"paragraph","text":"With BookLib, the student scans the library QR. If the student is outside, the scan marks check-in. If the student is inside, the next scan marks checkout. Owners can still mark manual attendance for students without their own phone."},
    {"type":"list","items":["Cleaner entry and exit records","Less staff dependency at reception","Inside-now visibility","Manual attendance fallback for special cases","Better reports for discipline and usage"]},
    {"type":"faq","question":"Can owners still mark attendance manually?","answer":"Yes. BookLib supports manual attendance for owner and permitted team members, so students without phones are not blocked."}
  ]'::jsonb,
  'PUBLISHED',
  NOW() - INTERVAL '4 days'
),
(
  'How to Start a Profitable Study Library in India',
  'how-to-start-profitable-study-library-india',
  'Growth',
  'From seats and plans to visibility and retention, here is a practical operating model for a profitable study library.',
  '',
  'How to Start a Profitable Study Library in India',
  'A practical guide to launching a study library with seat planning, student plans, QR attendance, marketplace discovery, and retention.',
  9,
  '[
    {"type":"heading","text":"Profit starts with clarity"},
    {"type":"paragraph","text":"A profitable library needs more than rent and chairs. The owner must know capacity, pricing, dues, attendance, renewals, and enquiry sources. Without this visibility, even a full library can leak revenue."},
    {"type":"list","items":["Define monthly and short-term plans","Create a clean admission workflow","Keep seat allotment separate from enquiry handling","Use QR attendance for discipline","Publish a strong public listing with photos, amenities, offers, and pricing"]},
    {"type":"heading","text":"Use software from day one"},
    {"type":"paragraph","text":"Starting on spreadsheets often feels cheaper, but it creates confusion once students, dues, and seat changes increase. BookLib gives owners a structured system for operations and growth from the beginning."}
  ]'::jsonb,
  'PUBLISHED',
  NOW() - INTERVAL '3 days'
),
(
  'Seat Management Software for Libraries: What Owners Should Check',
  'seat-management-software-libraries-owner-checklist',
  'Seat Management',
  'Before choosing a library seat management tool, check whether it supports daily allotment, sections, status changes, and student visibility.',
  '',
  'Seat Management Software for Libraries: Owner Checklist',
  'Checklist for library owners choosing seat management software: floor setup, seat status, allotment, sections, reports, and mobile usability.',
  7,
  '[
    {"type":"heading","text":"Seat tools should match daily work"},
    {"type":"paragraph","text":"Many tools show a seat grid, but owners need a complete flow: select student, choose free seat, confirm allotment, and later change or remove assignment without confusion."},
    {"type":"list","items":["Setup state for new floors","Daily state for active allotment","Rooms and sections for real layouts","Status controls for reserve, block, and free","Mobile-friendly map and compact summaries"]},
    {"type":"heading","text":"BookLib seat map philosophy"},
    {"type":"paragraph","text":"BookLib keeps daily allotment simple and hides advanced layout work behind manage-layout controls. This keeps the owner focused on the next action instead of a crowded control panel."}
  ]'::jsonb,
  'PUBLISHED',
  NOW() - INTERVAL '2 days'
),
(
  'Library Marketplace vs Normal Website: How Students Discover You Faster',
  'library-marketplace-vs-normal-website-student-discovery',
  'Marketplace',
  'A branded website builds trust, but a marketplace helps students compare, discover, and contact your library faster.',
  '',
  'Library Marketplace vs Normal Website',
  'Understand why study libraries need both a marketplace listing and a branded website for better student discovery and conversion.',
  7,
  '[
    {"type":"heading","text":"Students compare before they call"},
    {"type":"paragraph","text":"Most students want to know location, pricing, facilities, photos, timings, and seat availability before contacting a library. A normal website helps your brand, but a marketplace helps students discover you while comparing options."},
    {"type":"list","items":["Marketplace listing for discovery","Subdomain website for trust","Plans and offers for conversion","Call and WhatsApp actions for fast enquiries","Student login after admission"]},
    {"type":"heading","text":"BookLib connects both"},
    {"type":"paragraph","text":"Owner updates plans, offers, photos, and public profile once. The same information can power the marketplace listing and public website, so owners do not maintain duplicate content."}
  ]'::jsonb,
  'PUBLISHED',
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (slug) DO NOTHING;
