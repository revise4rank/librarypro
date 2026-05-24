import type { Pool } from "pg";

export type OfferCategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export type OfferRow = {
  id: string;
  category_id: string;
  category_name: string;
  title: string;
  image_url: string | null;
  short_description: string;
  long_description: string | null;
  city: string | null;
  area: string | null;
  valid_until: string | null;
  cta_label: string;
  cta_url: string | null;
  contact_phone: string | null;
  is_featured: boolean;
  status: string;
  source_type: string;
  owner_library_name: string | null;
  total_views?: string;
  total_clicks?: string;
};

export class OffersRepository {
  constructor(private readonly pool: Pool) {}

  async listCategories() {
    const result = await this.pool.query<OfferCategoryRow>(
      `SELECT id, slug, name, description FROM offer_categories ORDER BY name ASC`,
    );
    return result.rows;
  }

  async listOffers(input: {
    category?: string;
    city?: string;
    area?: string;
    featured?: boolean;
    libraryId?: string | null;
    page: number;
    limit: number;
  }) {
    const conditions = [
      "o.status = 'APPROVED'",
      "(o.valid_until IS NULL OR o.valid_until >= NOW())",
    ];
    const values: Array<string | number | boolean> = [];

    if (input.category) {
      values.push(input.category);
      conditions.push(`(c.slug = $${values.length} OR o.category_id::text = $${values.length})`);
    }
    if (input.city) {
      values.push(input.city);
      conditions.push(`COALESCE(o.city, '') ILIKE $${values.length}`);
    }
    if (input.area) {
      values.push(`%${input.area}%`);
      conditions.push(`COALESCE(o.area, '') ILIKE $${values.length}`);
    }
    if (input.featured) {
      conditions.push("o.is_featured = TRUE");
    }
    if (input.libraryId) {
      values.push(input.libraryId);
      conditions.push(`(o.target_library_id IS NULL OR o.target_library_id = $${values.length}::uuid)`);
    }

    const offset = (input.page - 1) * input.limit;
    const baseSql = `
      FROM offers o
      INNER JOIN offer_categories c ON c.id = o.category_id
      LEFT JOIN libraries l ON l.id = o.owner_library_id
      WHERE ${conditions.join(" AND ")}
    `;

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count ${baseSql}`,
      values,
    );

    values.push(input.limit, offset);
    const result = await this.pool.query<OfferRow>(
      `
      SELECT
        o.id,
        o.category_id::text,
        c.name AS category_name,
        o.title,
        o.image_url,
        o.short_description,
        o.long_description,
        o.city,
        o.area,
        o.valid_until::text,
        o.cta_label,
        o.cta_url,
        o.contact_phone,
        o.is_featured,
        o.status::text,
        o.source_type::text,
        l.name AS owner_library_name
      ${baseSql}
      ORDER BY o.is_featured DESC, o.created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
      `,
      values,
    );

    return {
      rows: result.rows,
      total: Number(countResult.rows[0]?.count ?? "0"),
      page: input.page,
      limit: input.limit,
    };
  }

  async createOffer(input: {
    categoryId: string;
    sourceType: "ADMIN" | "OWNER";
    createdByUserId: string;
    ownerLibraryId?: string | null;
    title: string;
    imageUrl?: string | null;
    shortDescription: string;
    longDescription?: string | null;
    city?: string | null;
    area?: string | null;
    targetLibraryId?: string | null;
    validFrom?: string | null;
    validUntil?: string | null;
    ctaLabel: string;
    ctaUrl?: string | null;
    contactPhone?: string | null;
    isFeatured: boolean;
    status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
    approvedByUserId?: string | null;
    reviewNotes?: string | null;
  }) {
    const result = await this.pool.query(
      `
      INSERT INTO offers (
        category_id, source_type, created_by_user_id, owner_library_id, approved_by_user_id,
        title, image_url, short_description, long_description, city, area, target_library_id,
        valid_from, valid_until, cta_label, cta_url, contact_phone, is_featured, status, review_notes
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12,
        COALESCE($13::timestamptz, NOW()), $14::timestamptz, $15, $16, $17, $18, $19, $20
      )
      RETURNING id
      `,
      [
        input.categoryId,
        input.sourceType,
        input.createdByUserId,
        input.ownerLibraryId ?? null,
        input.approvedByUserId ?? null,
        input.title,
        input.imageUrl ?? null,
        input.shortDescription,
        input.longDescription ?? null,
        input.city ?? null,
        input.area ?? null,
        input.targetLibraryId ?? null,
        input.validFrom ?? null,
        input.validUntil ?? null,
        input.ctaLabel,
        input.ctaUrl ?? null,
        input.contactPhone ?? null,
        input.isFeatured,
        input.status,
        input.reviewNotes ?? null,
      ],
    );

    return result.rows[0];
  }

  async listAdminOffers() {
    const result = await this.pool.query<OfferRow>(
      `
      SELECT
        o.id,
        o.category_id::text,
        c.name AS category_name,
        o.title,
        o.image_url,
        o.short_description,
        o.long_description,
        o.city,
        o.area,
        o.valid_until::text,
        o.cta_label,
        o.cta_url,
        o.contact_phone,
        o.is_featured,
        o.status::text,
        o.source_type::text,
        l.name AS owner_library_name,
        (SELECT COUNT(*)::text FROM offer_views ov WHERE ov.offer_id = o.id) AS total_views,
        (SELECT COUNT(*)::text FROM offer_clicks oc WHERE oc.offer_id = o.id) AS total_clicks
      FROM offers o
      INNER JOIN offer_categories c ON c.id = o.category_id
      LEFT JOIN libraries l ON l.id = o.owner_library_id
      ORDER BY o.created_at DESC
      LIMIT 200
      `,
    );
    return result.rows;
  }

  async trackView(input: {
    offerId: string;
    studentUserId?: string | null;
    libraryId?: string | null;
    city?: string | null;
  }) {
    await this.pool.query(
      `
      INSERT INTO offer_views (offer_id, student_user_id, library_id, city)
      VALUES ($1, $2, $3, $4)
      `,
      [input.offerId, input.studentUserId ?? null, input.libraryId ?? null, input.city ?? null],
    );
  }

  async trackClick(input: {
    offerId: string;
    actionType: "VIEW_DETAILS" | "CONTACT" | "APPLY";
    studentUserId?: string | null;
    libraryId?: string | null;
  }) {
    await this.pool.query(
      `
      INSERT INTO offer_clicks (offer_id, student_user_id, library_id, action_type)
      VALUES ($1, $2, $3, $4)
      `,
      [input.offerId, input.studentUserId ?? null, input.libraryId ?? null, input.actionType],
    );
  }
}
