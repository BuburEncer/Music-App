class ExportsHandler {
  constructor(producerService, playlistsService, validator) {
    this._producerService = producerService;
    this._playlistsService = playlistsService;
    this._validator = validator;

    this.postExportPlaylistHandler = this.postExportPlaylistHandler.bind(this);
  }

  async postExportPlaylistHandler(request, h) {
    try {
      // Validasi payload
      this._validator.validateExportPlaylistPayload(request.payload);

      const { playlistId } = request.params;
      const { targetEmail } = request.payload;
      const { id: credentialId } = request.auth.credentials;

      // Verifikasi bahwa user adalah pemilik playlist
      await this._playlistsService.verifyPlaylistOwner(playlistId, credentialId);

      // Kirim message ke RabbitMQ
      const message = {
        playlistId,
        targetEmail,
      };

      await this._producerService.sendMessage("export:playlist", JSON.stringify(message));

      const response = h.response({
        status: "success",
        message: "Permintaan Anda sedang kami proses",
      });
      response.code(201);
      return response;
    } catch (error) {
      if (error.statusCode) {
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

module.exports = ExportsHandler;
