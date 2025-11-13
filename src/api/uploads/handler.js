const path = require("path");

class UploadsHandler {
  constructor(storageService, albumsService, validator) {
    this._storageService = storageService;
    this._albumsService = albumsService;
    this._validator = validator;

    this.postUploadCoverHandler = this.postUploadCoverHandler.bind(this);
  }

  async postUploadCoverHandler(request, h) {
    try {
      const { cover } = request.payload;
      const { id } = request.params;

      // Validasi file upload (MIME type)
      this._validator.validateImageHeaders(cover.hapi.headers);

      // Upload file
      const filename = await this._storageService.writeFile(cover, cover.hapi);

      // Dapatkan URL file
      const coverUrl = `http://${process.env.HOST}:${process.env.PORT}/upload/images/${filename}`;

      // Update coverUrl di database
      await this._albumsService.updateAlbumCover(id, coverUrl);

      const response = h.response({
        status: "success",
        message: "Sampul berhasil diunggah",
      });
      response.code(201);
      return response;
    } catch (error) {
      // ✅ Tangani error 413 Payload Too Large dari Hapi
      if (error.output && error.output.statusCode === 413) {
        const response = h.response({
          status: "fail",
          message: "Payload content length greater than maximum allowed: 512000",
        });
        response.code(413);
        return response;
      }

      // ✅ Tangani error dari validator atau custom error
      if (error.statusCode === 400) {
        const response = h.response({
          status: "fail",
          message: error.message,
        });
        response.code(400);
        return response;
      }

      // ✅ Tangani error 404 jika album tidak ditemukan
      if (error.statusCode === 404) {
        const response = h.response({
          status: "fail",
          message: error.message,
        });
        response.code(404);
        return response;
      }

      // ✅ Tangani custom error dengan statusCode
      if (error.statusCode) {
        const response = h.response({
          status: "fail",
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      // ✅ Error 500 untuk error tidak terduga
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

module.exports = UploadsHandler;
