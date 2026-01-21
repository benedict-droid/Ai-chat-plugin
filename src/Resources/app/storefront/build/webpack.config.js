const { join, resolve } = require('path');

module.exports = () => {
    return {
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx'],
            alias: {
                '@': resolve('src')
            }
        }
    };
};
