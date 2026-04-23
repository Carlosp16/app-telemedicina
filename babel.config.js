// -----------------------------------------------------------------------------
// Configuración de Babel para Expo + TypeScript.
// El preset 'babel-preset-expo' cubre toda la cadena (RN, Hermes, Reanimated).
// -----------------------------------------------------------------------------
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Atajo de imports: "@/api/client" -> "src/api/client"
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
    ],
  };
};
