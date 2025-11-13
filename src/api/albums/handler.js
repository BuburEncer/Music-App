const ClientError = require("../../exceptions/ClientError");

class AlbumsHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    this.postAlbumHandler = this.postAlbumHandler.bind(this);
    this.getAlbumByIdHandler = this.getAlbumByIdHandler.bind(this);
    this.putAlbumByIdHandler = this.putAlbumByIdHandler.bind(this);
    this.deleteAlbumByIdHandler = this.deleteAlbumByIdHandler.bind(this);
    this.postAlbumLikeHandler = this.postAlbumLikeHandler.bind(this);
    this.deleteAlbumLikeHandler = this.deleteAlbumLikeHandler.bind(this);
    this.getAlbumLikesHandler = this.getAlbumLikesHandler.bind(this);
  }

  async postAlbumHandler(request, h) {
    try {
      this._validator.validateAlbumPayload(request.payload);
      const { name, year } = request.payload;

      const albumId = await this._service.addAlbum({ name, year });

      const response = h.response({
        status: "success",
        message: "Album berhasil ditambahkan",
        data: {
          albumId,
        },
      });
      response.code(201);
      return response;
    } catch (error) {
      const response = h.response({
        status: "fail",
        message: error.message,
      });
      response.code(400);
      return response;
    }
  }

  async getAlbumByIdHandler(request, h) {
    try {
      const { id } = request.params;
      const album = await this._service.getAlbumById(id);
      return {
        status: "success",
        data: {
          album,
        },
      };
    } catch (error) {
      const response = h.response({
        status: "fail",
        message: error.message,
      });
      response.code(404);
      return response;
    }
  }

  async putAlbumByIdHandler(request, h) {
    try {
      this._validator.validateAlbumPayload(request.payload);
      const { id } = request.params;

      await this._service.editAlbumById(id, request.payload);

      return {
        status: "success",
        message: "Album berhasil diperbarui",
      };
    } catch (error) {
      if (error.name === "InvariantError") {
        const response = h.response({
          status: "fail",
          message: error.message,
        });
        response.code(400);
        return response;
      }

      const response = h.response({
        status: "fail",
        message: error.message,
      });
      response.code(404);
      return response;
    }
  }

  async deleteAlbumByIdHandler(request, h) {
    try {
      const { id } = request.params;
      await this._service.deleteAlbumById(id);

      return {
        status: "success",
        message: "Album berhasil dihapus",
      };
    } catch (error) {
      const response = h.response({
        status: "fail",
        message: error.message,
      });
      response.code(404);
      return response;
    }
  }

  async postAlbumLikeHandler(request, h) {
    try {
      const { id: albumId } = request.params;
      const { id: userId } = request.auth.credentials;

      await this._service.addAlbumLike(albumId, userId);

      const response = h.response({
        status: "success",
        message: "Like berhasil ditambahkan",
      });
      response.code(201);
      return response;
    } catch (error) {
      if (error.name === "InvariantError") {
        const response = h.response({
          status: "fail",
          message: error.message,
        });
        response.code(400);
        return response;
      }

      if (error.name === "NotFoundError") {
        const response = h.response({
          status: "fail",
          message: error.message,
        });
        response.code(404);
        return response;
      }

      // Server ERROR!
      const response = h.response({
        status: "error",
        message: "Maaf, terjadi kegagalan pada server kami.",
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }

  async deleteAlbumLikeHandler(request, h) {
    try {
      const { id: albumId } = request.params;
      const { id: userId } = request.auth.credentials;

      await this._service.deleteAlbumLike(albumId, userId);

      return {
        status: "success",
        message: "Like berhasil dihapus",
      };
    } catch (error) {
      if (error.name === "NotFoundError") {
        const response = h.response({
          status: "fail",
          message: error.message,
        });
        response.code(404);
        return response;
      }

      // Server ERROR!
      const response = h.response({
        status: "error",
        message: "Maaf, terjadi kegagalan pada server kami.",
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }

  async getAlbumLikesHandler(request, h) {
    try {
      const { id } = request.params;

      // Ambil likes dari service (sudah include logic cache)
      const { likes, source } = await this._service.getAlbumLikesCount(id);

      const response = h.response({
        status: "success",
        data: {
          likes,
        },
      });

      response.code(200);
      // Set header berdasarkan source dari service
      response.header("X-Data-Source", source);

      return response;
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: "fail",
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      const response = h.response({
        status: "error",
        message: "Maaf, terjadi kegagalan pada server kami.",
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }
}

module.exports = AlbumsHandler;
