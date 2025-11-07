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
  pgm.createTable("playlist_songs", {
    id: {
      type: "VARCHAR(50)",
      primaryKey: true,
    },
    playlist_id: {
      type: "VARCHAR(50)",
      notNull: true,
    },
    song_id: {
      type: "VARCHAR(50)",
      notNull: true,
    },
  });

  // Add foreign key constraints
  pgm.addConstraint("playlist_songs", "fk_playlist_songs_playlist_id", {
    foreignKeys: {
      columns: "playlist_id",
      references: "playlists(id)",
      onDelete: "CASCADE",
    },
  });

  pgm.addConstraint("playlist_songs", "fk_playlist_songs_song_id", {
    foreignKeys: {
      columns: "song_id",
      references: "songs(id)",
      onDelete: "CASCADE",
    },
  });

  // Add unique constraint to prevent duplicate songs in same playlist
  pgm.addConstraint("playlist_songs", "unique_playlist_id_song_id", {
    unique: ["playlist_id", "song_id"],
  });

  // Add indexes for better performance
  pgm.createIndex("playlist_songs", "playlist_id");
  pgm.createIndex("playlist_songs", "song_id");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable("playlist_songs");
};
