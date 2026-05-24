import type { Pool } from "pg";

export type PublicLibrarySearchRow = {
  library_id: string;
  library_name: string;
  library_slug: string;
  city: string;
  area: string | null;
  address: string;
  latitude: string | null;
  longitude: string | null;
  available_seats: number;
  starting_price: string;
  offer_text: string | null;
  status: string;
  subdomain: string;
  custom_domain?: string | null;
  brand_logo_url: string | null;
  hero_banner_url?: string | null;
  hero_title: string;
  hero_tagline: string | null;
  about_text?: string | null;
  contact_name?: string | null;
  contact_phone: string | null;
  whatsapp_phone: string | null;
  email?: string | null;
  amenities: unknown;
  gallery_images: unknown;
  business_hours: string | null;
  landmark: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  highlight_offer?: string | null;
  offer_expires_at?: string | null;
  allow_direct_contact?: boolean;
  is_published: boolean;
  show_in_marketplace: boolean;
  theme_primary?: string | null;
  theme_accent?: string | null;
  theme_surface?: string | null;
  distance_km?: string | null;
  rating?: string | null;
  reviews?: string | null;
  latest_review_snippet?: string | null;
};

export type LibraryReviewRow = {
  id: string;
  library_id: string;
  student_user_id: string;
  student_name: string;
  rating: number;
  review_text: string;
  created_at: string;
  is_hidden?: boolean;
};

export type LibraryReviewSummaryRow = {
  average_rating: string;
  review_count: string;
};

export type LibraryReviewReportRow = {
  id: string;
  review_id: string;
  reporter_name: string;
  library_name: string;
  student_name: string;
  rating: number;
  review_text: string;
  reason: string;
  status: string;
  created_at: string;
};

export type OwnerPublicProfileRow = {
  id: string;
  library_id: string;
  subdomain: string;
  brand_logo_url: string | null;
  hero_banner_url: string | null;
  hero_title: string;
  hero_tagline: string | null;
  about_text: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  address_text: string;
  latitude: string | null;
  longitude: string | null;
  landmark: string | null;
  business_hours: string | null;
  amenities: unknown;
  gallery_images: unknown;
  seo_title: string | null;
  seo_description: string | null;
  meta_keywords: string | null;
  is_published: boolean;
  show_in_marketplace: boolean;
  allow_direct_contact: boolean;
  ad_budget: string;
  highlight_offer: string | null;
  offer_expires_at: string | null;
  theme_primary: string | null;
  theme_accent: string | null;
  theme_surface: string | null;
};

export type PublicLibrarySearchResult = {
  rows: PublicLibrarySearchRow[];
  total: number;
  page: number;
  limit: number;
};

export type SavePublicProfileInput = {
  libraryId: string;
  subdomain: string;
  brandLogoUrl: string;
  heroBannerUrl: string;
  heroTitle: string;
  heroTagline: string;
  aboutText: string;
  contactName: string;
  contactPhone: string;
  whatsappPhone: string;
  email: string;
  addressText: string;
  latitude: number | null;
  longitude: number | null;
  landmark: string;
  businessHours: string;
  amenities: string[];
  galleryImages: string[];
  seoTitle: string;
  seoDescription: string;
  metaKeywords: string;
  showInMarketplace: boolean;
  allowDirectContact: boolean;
  adBudget: number;
  highlightOffer: string;
  offerExpiresAt: string;
  themePrimary: string;
  themeAccent: string;
  themeSurface: string;
};

export type OwnerLeadRow = {
  id: string;
  channel: string;
  student_name: string | null;
  student_phone: string | null;
  student_email: string | null;
  message: string | null;
  source_page: string;
  status: string;
  assignee_label: string | null;
  follow_up_at: string | null;
  owner_notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
};

export type CreateContactLeadInput = {
  slugOrSubdomain: string;
  channel: "CALL" | "WHATSAPP" | "CHAT" | "FORM";
  studentName?: string;
  studentPhone?: string;
  studentEmail?: string;
  message?: string;
  sourcePage: "MARKETPLACE" | "LIBRARY_SITE";
  metadata: Record<string, unknown>;
};

export class PublicProfileRepository {
  constructor(private readonly pool: Pool) {}

  async refreshMarketplaceSearchIndex() {
    await this.pool.query("REFRESH MATERIALIZED VIEW marketplace_search_index");
  }

  async searchSuggestions(params: { q: string; limit: number }) {
    const value = `%${params.q.toLowerCase()}%`;
    const result = await this.pool.query<{ suggestion: string }>(
      `
      WITH suggestions AS (
        SELECT library_name AS suggestion
        FROM marketplace_search_index
        WHERE is_published = TRUE
          AND show_in_marketplace = TRUE
          AND library_status = 'ACTIVE'
          AND (
            search_text LIKE $1 OR
            library_name ILIKE $1 OR
            city ILIKE $1 OR
            COALESCE(area, '') ILIKE $1 OR
            subdomain ILIKE $1
          )
        UNION
        SELECT city AS suggestion
        FROM marketplace_search_index
        WHERE is_published = TRUE
          AND show_in_marketplace = TRUE
          AND library_status = 'ACTIVE'
          AND city ILIKE $1
        UNION
        SELECT COALESCE(area, '') AS suggestion
        FROM marketplace_search_index
        WHERE is_published = TRUE
          AND show_in_marketplace = TRUE
          AND library_status = 'ACTIVE'
          AND COALESCE(area, '') <> ''
          AND COALESCE(area, '') ILIKE $1
        UNION
        SELECT subdomain AS suggestion
        FROM marketplace_search_index
        WHERE is_published = TRUE
          AND show_in_marketplace = TRUE
          AND library_status = 'ACTIVE'
          AND subdomain ILIKE $1
      )
      SELECT DISTINCT suggestion
      FROM suggestions
      WHERE suggestion <> ''
      ORDER BY suggestion ASC
      LIMIT $2
      `,
      [value, params.limit],
    );

    return result.rows.map((row) => row.suggestion);
  }

  async isSubdomainAvailable(subdomain: string, excludeLibraryId?: string) {
    const result = await this.pool.query<{ exists: boolean }>(
      `
      SELECT EXISTS(
        SELECT 1
        FROM libraries_public_profiles
        WHERE subdomain = $1
          AND ($2::uuid IS NULL OR library_id <> $2::uuid)
      ) AS exists
      `,
      [subdomain, excludeLibraryId ?? null],
    );

    return !result.rows[0]?.exists;
  }

  async saveProfile(input: SavePublicProfileInput) {
    const result = await this.pool.query(
      `
      INSERT INTO libraries_public_profiles (
        library_id, subdomain, brand_logo_url, hero_title, hero_tagline, about_text, contact_name, contact_phone,
        whatsapp_phone, email, address_text, latitude, longitude, landmark, business_hours, amenities,
        gallery_images, seo_title, seo_description, meta_keywords, show_in_marketplace,
        allow_direct_contact, ad_budget, highlight_offer, offer_expires_at, hero_banner_url, theme_primary, theme_accent, theme_surface, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16::jsonb,
        $17::jsonb, $18, $19, $20, $21,
        $22, $23, $24, $25, $26, $27, $28, $29, NOW()
      )
      ON CONFLICT (library_id) DO UPDATE SET
        subdomain = EXCLUDED.subdomain,
        brand_logo_url = EXCLUDED.brand_logo_url,
        hero_title = EXCLUDED.hero_title,
        hero_tagline = EXCLUDED.hero_tagline,
        about_text = EXCLUDED.about_text,
        contact_name = EXCLUDED.contact_name,
        contact_phone = EXCLUDED.contact_phone,
        whatsapp_phone = EXCLUDED.whatsapp_phone,
        email = EXCLUDED.email,
        address_text = EXCLUDED.address_text,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        landmark = EXCLUDED.landmark,
        business_hours = EXCLUDED.business_hours,
        amenities = EXCLUDED.amenities,
        gallery_images = EXCLUDED.gallery_images,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        meta_keywords = EXCLUDED.meta_keywords,
        show_in_marketplace = EXCLUDED.show_in_marketplace,
        allow_direct_contact = EXCLUDED.allow_direct_contact,
        ad_budget = EXCLUDED.ad_budget,
        highlight_offer = EXCLUDED.highlight_offer,
        offer_expires_at = EXCLUDED.offer_expires_at,
        hero_banner_url = EXCLUDED.hero_banner_url,
        theme_primary = EXCLUDED.theme_primary,
        theme_accent = EXCLUDED.theme_accent,
        theme_surface = EXCLUDED.theme_surface,
        updated_at = NOW()
      RETURNING *
      `,
      [
        input.libraryId,
        input.subdomain,
        input.brandLogoUrl,
        input.heroTitle,
        input.heroTagline,
        input.aboutText,
        input.contactName,
        input.contactPhone,
        input.whatsappPhone,
        input.email,
        input.addressText,
        input.latitude,
        input.longitude,
        input.landmark,
        input.businessHours,
        JSON.stringify(input.amenities),
        JSON.stringify(input.galleryImages),
        input.seoTitle,
        input.seoDescription,
        input.metaKeywords,
        input.showInMarketplace,
        input.allowDirectContact,
        input.adBudget,
        input.highlightOffer,
        input.offerExpiresAt || null,
        input.heroBannerUrl,
        input.themePrimary,
        input.themeAccent,
        input.themeSurface,
      ],
    );

    return result.rows[0];
  }

  async setPublished(libraryId: string, isPublished: boolean) {
    const result = await this.pool.query(
      `
      UPDATE libraries_public_profiles
      SET is_published = $2,
          published_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
          updated_at = NOW()
      WHERE library_id = $1
      RETURNING *
      `,
      [libraryId, isPublished],
    );

    return result.rows[0] ?? null;
  }

  async findOwnerProfileByLibraryId(libraryId: string) {
    const result = await this.pool.query<OwnerPublicProfileRow>(
      `
      SELECT
        id,
        library_id,
        subdomain,
        brand_logo_url,
        hero_banner_url,
        hero_title,
        hero_tagline,
        about_text,
        contact_name,
        contact_phone,
        whatsapp_phone,
        email,
        address_text,
        latitude::text,
        longitude::text,
        landmark,
        business_hours,
        amenities,
        gallery_images,
        seo_title,
        seo_description,
        meta_keywords,
        is_published,
        show_in_marketplace,
        allow_direct_contact,
        ad_budget::text,
        highlight_offer,
        offer_expires_at::text,
        theme_primary,
        theme_accent,
        theme_surface
      FROM libraries_public_profiles
      WHERE library_id = $1
      LIMIT 1
      `,
      [libraryId],
    );

    return result.rows[0] ?? null;
  }

  async findBySlugOrSubdomain(value: string) {
    const result = await this.pool.query<PublicLibrarySearchRow>(
      `
      SELECT
        l.id AS library_id,
        l.name AS library_name,
        l.slug AS library_slug,
        l.city,
        l.area,
        l.address,
        l.latitude::text,
        l.longitude::text,
        l.available_seats,
        l.starting_price::text,
        l.offer_text,
        l.status,
        p.subdomain,
        p.custom_domain,
        p.brand_logo_url,
        p.hero_banner_url,
        p.hero_title,
        p.hero_tagline,
        p.about_text,
        p.contact_name,
        p.contact_phone,
        p.whatsapp_phone,
        p.email,
        p.amenities,
        p.gallery_images,
        p.business_hours,
        p.landmark,
        p.seo_title,
        p.seo_description,
        p.highlight_offer,
        p.offer_expires_at::text,
        p.allow_direct_contact,
        p.is_published,
        p.show_in_marketplace,
        p.theme_primary,
        p.theme_accent,
        p.theme_surface,
        COALESCE(rv.average_rating, 0)::text AS rating,
        COALESCE(rv.review_count, 0)::text AS reviews,
        rv.latest_review_snippet
      FROM libraries l
      INNER JOIN libraries_public_profiles p ON p.library_id = l.id
      LEFT JOIN (
        SELECT
          library_id,
          ROUND(AVG(rating)::numeric, 1) AS average_rating,
          COUNT(*) AS review_count,
          MAX(LEFT(review_text, 140)) FILTER (WHERE created_at = latest_created_at) AS latest_review_snippet
        FROM (
          SELECT
            library_id,
            rating,
            review_text,
            created_at,
            MAX(created_at) OVER (PARTITION BY library_id) AS latest_created_at
          FROM library_reviews
          WHERE is_hidden = FALSE
        ) visible_reviews
        GROUP BY library_id
      ) rv ON rv.library_id = l.id
      WHERE p.is_published = TRUE
        AND (l.slug = $1 OR p.subdomain = $1)
      LIMIT 1
      `,
      [value],
    );

    return result.rows[0] ?? null;
  }

  async search(params: {
    q?: string;
    city?: string;
    area?: string;
    amenities?: string[];
    minPrice?: number;
    maxPrice?: number;
    availableOnly?: boolean;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    limit: number;
    page: number;
  }): Promise<PublicLibrarySearchResult> {
    const conditions: string[] = [
      "m.is_published = TRUE",
      "m.show_in_marketplace = TRUE",
      "m.library_status = 'ACTIVE'",
    ];
    const values: Array<string | number | boolean | string[]> = [];

    if (params.q) {
      values.push(params.q.trim());
      const searchIndex = values.length;
      values.push(`%${params.q.trim().toLowerCase()}%`);
      const likeIndex = values.length;
      conditions.push(`(
        m.search_vector @@ plainto_tsquery('simple', $${searchIndex})
        OR m.search_text LIKE $${likeIndex}
      )`);
    }

    if (params.city) {
      values.push(params.city);
      conditions.push(`m.city ILIKE $${values.length}`);
    }

    if (params.area) {
      values.push(`%${params.area}%`);
      conditions.push(`COALESCE(m.area, '') ILIKE $${values.length}`);
    }

    if (typeof params.minPrice === "number") {
      values.push(params.minPrice);
      conditions.push(`m.starting_price >= $${values.length}`);
    }

    if (typeof params.maxPrice === "number") {
      values.push(params.maxPrice);
      conditions.push(`m.starting_price <= $${values.length}`);
    }

    if (params.availableOnly) {
      conditions.push("m.available_seats > 0");
    }

    if (params.amenities && params.amenities.length > 0) {
      values.push(params.amenities);
      conditions.push(`m.amenities ?& $${values.length}::text[]`);
    }

    let distanceSql = "NULL::numeric AS distance_km";
    if (typeof params.lat === "number" && typeof params.lng === "number") {
      values.push(params.lat);
      const latIndex = values.length;
      values.push(params.lng);
      const lngIndex = values.length;
      distanceSql = `
        (
          6371 * acos(
            cos(radians($${latIndex})) *
            cos(radians(COALESCE(m.latitude, $${latIndex}))) *
            cos(radians(COALESCE(m.longitude, $${lngIndex})) - radians($${lngIndex})) +
            sin(radians($${latIndex})) *
            sin(radians(COALESCE(m.latitude, $${latIndex})))
          )
        ) AS distance_km
      `;

      if (typeof params.radiusKm === "number") {
        const latDelta = params.radiusKm / 111;
        const lngDelta = params.radiusKm / Math.max(1, 111 * Math.cos((params.lat * Math.PI) / 180));
        values.push(params.lat - latDelta);
        const minLatIndex = values.length;
        values.push(params.lat + latDelta);
        const maxLatIndex = values.length;
        values.push(params.lng - lngDelta);
        const minLngIndex = values.length;
        values.push(params.lng + lngDelta);
        const maxLngIndex = values.length;
        conditions.push(`
          m.latitude IS NOT NULL
          AND m.longitude IS NOT NULL
          AND m.latitude BETWEEN $${minLatIndex} AND $${maxLatIndex}
          AND m.longitude BETWEEN $${minLngIndex} AND $${maxLngIndex}
        `);

        values.push(params.radiusKm);
        const radiusIndex = values.length;
        conditions.push(`
          (
            6371 * acos(
              cos(radians($${latIndex})) *
              cos(radians(m.latitude)) *
              cos(radians(m.longitude) - radians($${lngIndex})) +
              sin(radians($${latIndex})) *
              sin(radians(m.latitude))
            ) <= $${radiusIndex}
          )
        `);
      }
    }

    const offset = (params.page - 1) * params.limit;
    const baseSql = `
      FROM marketplace_search_index m
      LEFT JOIN (
        SELECT
          library_id,
          ROUND(AVG(rating)::numeric, 1) AS average_rating,
          COUNT(*) AS review_count,
          MAX(LEFT(review_text, 140)) FILTER (WHERE created_at = latest_created_at) AS latest_review_snippet
        FROM (
          SELECT
            library_id,
            rating,
            review_text,
            created_at,
            MAX(created_at) OVER (PARTITION BY library_id) AS latest_created_at
          FROM library_reviews
          WHERE is_hidden = FALSE
        ) visible_reviews
        GROUP BY library_id
      ) rv ON rv.library_id = m.library_id
      WHERE ${conditions.join(" AND ")}
    `;

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count ${baseSql}`,
      values,
    );

    values.push(params.limit);
    values.push(offset);

    const result = await this.pool.query<PublicLibrarySearchRow>(
      `
      SELECT
        m.library_id,
        m.library_name,
        m.library_slug,
        m.city,
        m.area,
        m.address,
        m.latitude::text,
        m.longitude::text,
        m.available_seats,
        m.starting_price::text,
        m.offer_text,
        m.library_status AS status,
        m.subdomain,
        m.custom_domain,
        m.brand_logo_url,
        m.hero_banner_url,
        m.hero_title,
        m.hero_tagline,
        m.about_text,
        m.contact_name,
        m.contact_phone,
        m.whatsapp_phone,
        m.email,
        m.amenities,
        m.gallery_images,
        m.business_hours,
        m.landmark,
        m.seo_title,
        m.seo_description,
        m.highlight_offer,
        m.offer_expires_at::text,
        m.allow_direct_contact,
        m.is_published,
        m.show_in_marketplace,
        m.theme_primary,
        m.theme_accent,
        m.theme_surface,
        COALESCE(rv.average_rating, 0)::text AS rating,
        COALESCE(rv.review_count, 0)::text AS reviews,
        rv.latest_review_snippet,
        ${distanceSql}
      ${baseSql}
      ORDER BY
        distance_km ASC NULLS LAST,
        m.available_seats DESC,
        m.starting_price ASC,
        m.library_name ASC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
      `,
      values,
    );

    return {
      rows: result.rows,
      total: Number(countResult.rows[0]?.count ?? "0"),
      page: params.page,
      limit: params.limit,
    };
  }

  async createContactLead(input: CreateContactLeadInput) {
    const result = await this.pool.query(
      `
      INSERT INTO library_contact_leads (
        library_id,
        public_profile_id,
        channel,
        student_name,
        student_phone,
        student_email,
        message,
        source_page,
        metadata,
        assignee_label,
        follow_up_at
      )
      SELECT
        l.id,
        p.id,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8::jsonb,
        'Owner Desk',
        NOW() + INTERVAL '2 hours'
      FROM libraries l
      INNER JOIN libraries_public_profiles p ON p.library_id = l.id
      WHERE p.is_published = TRUE
        AND (l.slug = $1 OR p.subdomain = $1)
      LIMIT 1
      RETURNING id, library_id, public_profile_id, channel, source_page, created_at
      `,
      [
        input.slugOrSubdomain,
        input.channel,
        input.studentName ?? null,
        input.studentPhone ?? null,
        input.studentEmail ?? null,
        input.message ?? null,
        input.sourcePage,
        JSON.stringify(input.metadata),
      ],
    );

    return result.rows[0] ?? null;
  }

  async listLibraryReviews(slugOrSubdomain: string) {
    const result = await this.pool.query<LibraryReviewRow>(
      `
      SELECT
        lr.id::text,
        lr.library_id::text,
        lr.student_user_id::text,
        u.full_name AS student_name,
        lr.rating,
        lr.review_text,
        lr.created_at::text,
        lr.is_hidden
      FROM library_reviews lr
      INNER JOIN libraries l ON l.id = lr.library_id
      INNER JOIN libraries_public_profiles p ON p.library_id = l.id
      INNER JOIN users u ON u.id = lr.student_user_id
      WHERE p.is_published = TRUE
        AND (l.slug = $1 OR p.subdomain = $1)
        AND lr.is_hidden = FALSE
      ORDER BY lr.created_at DESC
      LIMIT 50
      `,
      [slugOrSubdomain],
    );

    return result.rows;
  }

  async getLibraryReviewSummaryByLibraryId(libraryId: string) {
    const result = await this.pool.query<LibraryReviewSummaryRow>(
      `
      SELECT
        COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::text AS average_rating,
        COUNT(*)::text AS review_count
      FROM library_reviews
      WHERE library_id = $1
        AND is_hidden = FALSE
      `,
      [libraryId],
    );

    return result.rows[0] ?? { average_rating: "0", review_count: "0" };
  }

  async hasStudentLibraryHistory(libraryId: string, studentUserId: string) {
    const result = await this.pool.query<{ exists_flag: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM student_library_mapping
        WHERE library_id = $1
          AND student_user_id = $2
      ) AS exists_flag
      `,
      [libraryId, studentUserId],
    );

    return result.rows[0]?.exists_flag ?? false;
  }

  async createOrUpdateLibraryReview(input: {
    libraryId: string;
    studentUserId: string;
    rating: number;
    reviewText: string;
  }) {
    const result = await this.pool.query<LibraryReviewRow>(
      `
      INSERT INTO library_reviews (library_id, student_user_id, rating, review_text)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (library_id, student_user_id)
      DO UPDATE SET
        rating = EXCLUDED.rating,
        review_text = EXCLUDED.review_text,
        updated_at = NOW()
      RETURNING
        id::text,
        library_id::text,
        student_user_id::text,
        ''::text AS student_name,
        rating,
        review_text,
        created_at::text
      `,
      [input.libraryId, input.studentUserId, input.rating, input.reviewText],
    );

    return result.rows[0] ?? null;
  }

  async reportLibraryReview(input: {
    reviewId: string;
    reporterUserId: string;
    reason: string;
  }) {
    const result = await this.pool.query<{ id: string }>(
      `
      INSERT INTO library_review_reports (review_id, reporter_user_id, reason)
      VALUES ($1, $2, $3)
      ON CONFLICT (review_id, reporter_user_id)
      DO UPDATE SET
        reason = EXCLUDED.reason,
        status = 'OPEN',
        reviewed_at = NULL
      RETURNING id::text
      `,
      [input.reviewId, input.reporterUserId, input.reason],
    );

    return result.rows[0] ?? null;
  }

  async listReviewReports() {
    const result = await this.pool.query<LibraryReviewReportRow>(
      `
      SELECT
        r.id::text,
        r.review_id::text,
        reporter.full_name AS reporter_name,
        l.name AS library_name,
        student.full_name AS student_name,
        lr.rating,
        lr.review_text,
        r.reason,
        r.status,
        r.created_at::text
      FROM library_review_reports r
      INNER JOIN library_reviews lr ON lr.id = r.review_id
      INNER JOIN libraries l ON l.id = lr.library_id
      INNER JOIN users reporter ON reporter.id = r.reporter_user_id
      INNER JOIN users student ON student.id = lr.student_user_id
      ORDER BY CASE r.status WHEN 'OPEN' THEN 0 ELSE 1 END, r.created_at DESC
      LIMIT 200
      `,
      [],
    );

    return result.rows;
  }

  async moderateReview(input: {
    reviewId: string;
    action: "HIDE" | "RESTORE";
    reason?: string | null;
  }) {
    const result = await this.pool.query<{ id: string; library_id: string }>(
      `
      UPDATE library_reviews
      SET
        is_hidden = CASE WHEN $2 = 'HIDE' THEN TRUE ELSE FALSE END,
        hidden_reason = CASE WHEN $2 = 'HIDE' THEN $3 ELSE NULL END,
        hidden_at = CASE WHEN $2 = 'HIDE' THEN NOW() ELSE NULL END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id::text, library_id::text
      `,
      [input.reviewId, input.action, input.reason ?? null],
    );

    if (!result.rows[0]) {
      return null;
    }

    await this.pool.query(
      `
      UPDATE library_review_reports
      SET status = CASE WHEN $2 = 'HIDE' THEN 'ACTIONED' ELSE 'RESOLVED' END,
          reviewed_at = NOW()
      WHERE review_id = $1
        AND status = 'OPEN'
      `,
      [input.reviewId, input.action],
    );

    return result.rows[0];
  }

  async listOwnerLeads(libraryId: string, status?: string | null) {
    const result = await this.pool.query<OwnerLeadRow>(
      `
      SELECT
        id,
        channel,
        student_name,
        student_phone,
        student_email,
        message,
        source_page,
        status,
        assignee_label,
        follow_up_at::text,
        owner_notes,
        last_contacted_at::text,
        created_at::text
      FROM library_contact_leads
      WHERE library_id = $1
        AND ($2::text IS NULL OR status = $2)
      ORDER BY created_at DESC
      LIMIT 250
      `,
      [libraryId, status ?? null],
    );

    return result.rows;
  }

  async updateOwnerLead(input: {
    libraryId: string;
    leadId: string;
    status?: string | null;
    assigneeLabel?: string | null;
    followUpAt?: string | null;
    ownerNotes?: string | null;
    lastContactedAt?: string | null;
  }) {
    const result = await this.pool.query<OwnerLeadRow>(
      `
      UPDATE library_contact_leads
      SET
        status = COALESCE($3, status),
        assignee_label = COALESCE($4, assignee_label),
        follow_up_at = COALESCE($5::timestamptz, follow_up_at),
        owner_notes = COALESCE($6, owner_notes),
        last_contacted_at = COALESCE($7::timestamptz, last_contacted_at)
      WHERE id = $1
        AND library_id = $2
      RETURNING
        id,
        channel,
        student_name,
        student_phone,
        student_email,
        message,
        source_page,
        status,
        assignee_label,
        follow_up_at::text,
        owner_notes,
        last_contacted_at::text,
        created_at::text
      `,
      [
        input.leadId,
        input.libraryId,
        input.status ?? null,
        input.assigneeLabel ?? null,
        input.followUpAt ?? null,
        input.ownerNotes ?? null,
        input.lastContactedAt ?? null,
      ],
    );

    return result.rows[0] ?? null;
  }
}
