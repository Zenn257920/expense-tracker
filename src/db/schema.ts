import {
  pgTable,
  text,
  boolean,
  timestamp,
  uuid,
  varchar,
  pgEnum,
  numeric,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 100 }).notNull(),

    type: categoryTypeEnum("type").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("categories_user_name_type_unique").on(
      table.userId,
      table.name,
      table.type,
    ),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),

    description: text("description").notNull(),

    amount: numeric("amount", {
      precision: 12,
      scale: 2,
    }).notNull(),

    transactionDate: date("transaction_date", {
      mode: "string",
    }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("transactions_user_id_idx").on(table.userId),
    index("transactions_category_id_idx").on(table.categoryId),
    index("transactions_date_idx").on(table.transactionDate),
  ],
);
