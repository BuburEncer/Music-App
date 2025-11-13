const { Pool } = require("pg");
const { nanoid } = require("nanoid");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require("../../exceptions/NotFoundError");

class AlbumsService {
  constructor(cacheService) {
    this._pool = new Pool();
    this._cacheService = cacheService;
  }

  async addAlbum({ name, year }) {
    const id = `album-${nanoid(16)}`;

    const query = {
      text: "INSERT INTO albums VALUES($1, $2, $3) RETURNING id",
      values: [id, name, year],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError("Album gagal ditambahkan");
    }

    return result.rows[0].id;
  }

  async getAlbumById(id) {
    const albumQuery = {
      text: "SELECT id, name, year, cover_url FROM albums WHERE id = $1",
      values: [id],
    };

    const albumResult = await this._pool.query(albumQuery);

    if (!albumResult.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }

    const songsQuery = {
      text: "SELECT id, title, performer FROM songs WHERE album_id = $1",
      values: [id],
    };

    const songsResult = await this._pool.query(songsQuery);

    const album = albumResult.rows[0];

    return {
      id: album.id,
      name: album.name,
      year: album.year,
      coverUrl: album.cover_url,
      songs: songsResult.rows,
    };
  }

  async editAlbumById(id, { name, year }) {
    const query = {
      text: "UPDATE albums SET name = $1, year = $2 WHERE id = $3 RETURNING id",
      values: [name, year, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Gagal memperbarui album. Id tidak ditemukan");
    }
  }

  async deleteAlbumById(id) {
    const query = {
      text: "DELETE FROM albums WHERE id = $1 RETURNING id",
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Album gagal dihapus. Id tidak ditemukan");
    }
  }

  async updateAlbumCover(id, coverUrl) {
    const query = {
      text: "UPDATE albums SET cover_url = $1 WHERE id = $2 RETURNING id",
      values: [coverUrl, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Gagal memperbarui cover album. Id tidak ditemukan");
    }
  }

  async addAlbumLike(id, userId) {
    // Verifikasi album exists
    await this.verifyAlbumExists(id);

    // Cek apakah user sudah like album ini
    const checkQuery = {
      text: "SELECT * FROM user_album_likes WHERE user_id = $1 AND album_id = $2",
      values: [userId, id],
    };

    const checkResult = await this._pool.query(checkQuery);

    if (checkResult.rows.length > 0) {
      throw new InvariantError("Anda sudah menyukai album ini");
    }

    // Insert like
    const query = {
      text: "INSERT INTO user_album_likes VALUES($1, $2) RETURNING user_id",
      values: [userId, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new InvariantError("Like gagal ditambahkan");
    }

    await this._cacheService.delete(`album_likes:${id}`);

    return result.rows[0].user_id;
  }

  async deleteAlbumLike(id, userId) {
    // Verifikasi album exists
    await this.verifyAlbumExists(id);

    const query = {
      text: "DELETE FROM user_album_likes WHERE user_id = $1 AND album_id = $2 RETURNING user_id",
      values: [userId, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Like gagal dihapus. Anda belum menyukai album ini");
    }

    await this._cacheService.delete(`album_likes:${id}`);
  }

  async getAlbumLikesCount(id) {
    try {
      const cacheKey = `album_likes:${id}`;
      const cachedLikes = await this._cacheService.get(cacheKey);

      if (cachedLikes !== null) {
        return {
          likes: parseInt(cachedLikes),
          source: "cache",
        };
      }

      await this.verifyAlbumExists(id);

      // 3. Jika tidak ada di cache, ambil dari database
      const query = {
        text: "SELECT COUNT(*) FROM user_album_likes WHERE album_id = $1",
        values: [id],
      };

      const result = await this._pool.query(query);
      const likes = parseInt(result.rows[0].count);

      // 4. Simpan ke cache (expire 30 menit = 1800 detik)
      await this._cacheService.set(cacheKey, likes, 1800);

      // 5. Return dengan source database
      return {
        likes,
        source: "database",
      };
    } catch (error) {
      throw error;
    }
  }

  async verifyAlbumExists(id) {
    const query = {
      text: "SELECT id FROM albums WHERE id = $1",
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError("Album tidak ditemukan");
    }
  }
}

module.exports = AlbumsService;
