const Hapi = require("@hapi/hapi");
require("dotenv").config();
const Jwt = require("@hapi/jwt");
const path = require("path");
const Inert = require("@hapi/inert");

// Services
const AlbumsService = require("./services/postgres/AlbumsService");
const SongsService = require("./services/postgres/SongsService");
const UsersService = require("./services/postgres/UsersService");
const AuthenticationsService = require("./services/postgres/AuthenticationsService");
const PlaylistsService = require("./services/postgres/PlaylistsServices");
const ProducerService = require("./services/rabbitmq/ProducerService");
const StorageService = require("./services/storage/StorageService");
const CacheService = require("./services/redis/CacheService");

// Validators
const AlbumsValidator = require("./validator/albums");
const SongsValidator = require("./validator/songs");
const UsersValidator = require("./validator/users");
const AuthenticationsValidator = require("./validator/authentications");
const PlaylistsValidator = require("./validator/playlists");
const ExportsValidator = require("./validator/exports");
const UploadsValidator = require("./validator/uploads");

// Plugins
const albums = require("./api/albums");
const songs = require("./api/songs");
const users = require("./api/users");
const authentications = require("./api/authentications");
const playlists = require("./api/playlists");
const _exports = require("./api/exports");
const uploads = require("./api/uploads");

// JWT Token Manager
const TokenManager = require("./tokenize/TokenManager");

// Exceptions
const ClientError = require("./exceptions/ClientError");

const init = async () => {
  // Service instances
  const cacheService = new CacheService();
  const albumsService = new AlbumsService(cacheService);
  const songsService = new SongsService();
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const playlistsService = new PlaylistsService();
  const storageService = new StorageService(path.resolve(__dirname, "./api/uploads/file/images"));

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  await server.register([
    {
      plugin: Jwt,
    },
    {
      plugin: Inert,
    },
  ]);

  server.auth.strategy("openmusic_jwt", "jwt", {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  await server.register([
    {
      plugin: albums,
      options: {
        service: albumsService,
        validator: AlbumsValidator,
      },
    },
    {
      plugin: songs,
      options: {
        service: songsService,
        validator: SongsValidator,
      },
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        playlistsService,
        songsService,
        validator: PlaylistsValidator,
      },
    },
    {
      plugin: _exports,
      options: {
        producerService: ProducerService,
        playlistsService,
        validator: ExportsValidator,
      },
    },
    {
      plugin: uploads,
      options: {
        storageService,
        albumsService,
        validator: UploadsValidator,
      },
    },
  ]);

  server.ext("onPreResponse", (request, h) => {
    const { response } = request;

    if (response instanceof Error) {
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: "fail",
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }

      if (!response.isServer) {
        return h.continue;
      }

      const newResponse = h.response({
        status: "error",
        message: "Maaf, terjadi kegagalan pada server kami.",
      });
      newResponse.code(500);
      console.error(response);
      return newResponse;
    }

    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init();
