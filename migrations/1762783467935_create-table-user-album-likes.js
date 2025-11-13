/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable("user_album_likes", {
    user_id: {
      type: "VARCHAR(50)",
      notNull: true,
    },
    album_id: {
      type: "VARCHAR(50)",
      notNull: true,
    },
  });

  // Primary key composite
  pgm.addConstraint("user_album_likes", "pk_user_album_likes", {
    primaryKey: ["user_id", "album_id"],
  });

  // Foreign key ke users
  pgm.addConstraint("user_album_likes", "fk_user_album_likes.user_id_users.id", {
    foreignKeys: {
      columns: "user_id",
      references: "users(id)",
      onDelete: "CASCADE",
    },
  });

  // Foreign key ke albums
  pgm.addConstraint("user_album_likes", "fk_user_album_likes.album_id_albums.id", {
    foreignKeys: {
      columns: "album_id",
      references: "albums(id)",
      onDelete: "CASCADE",
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("user_album_likes");
};
