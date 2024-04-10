const path = require('path');
const fs = require('fs');

// source template name
const src = 'pintura.html';

// need to have a reference to the root of the project so we can find npm modules
const projectRoot = process.env.INIT_CWD;

// read pintura js and css files
const pathPinturaJS = path.join(
    projectRoot,
    'node_modules',
    '@pqina',
    'pintura',
    'pintura-iife.js'
);
const contentsPinturaJS = fs.readFileSync(pathPinturaJS, { encoding: 'utf8' });
const pathPinturaCSS = path.join(projectRoot, 'node_modules', '@pqina', 'pintura', 'pintura.css');
const contentsPinturaCSS = fs.readFileSync(pathPinturaCSS, { encoding: 'utf8' });

// read pintura video js and css files
const pathPinturaVideoJS = path.join(
    projectRoot,
    'node_modules',
    '@pqina',
    'pintura-video',
    'pinturavideo-iife.js'
);
const contentsPinturaVideoJS = fs.existsSync(pathPinturaVideoJS)
    ? fs.readFileSync(pathPinturaVideoJS, { encoding: 'utf8' })
    : undefined;

const pathPinturaVideoCSS = path.join(
    projectRoot,
    'node_modules',
    '@pqina',
    'pintura-video',
    'pinturavideo.css'
);
const contentsPinturaVideoCSS = fs.existsSync(pathPinturaVideoCSS)
    ? fs.readFileSync(pathPinturaVideoCSS, { encoding: 'utf8' })
    : undefined;

// read optional dependencies for video encoding
const pathWebMMuxer = path.join(
    projectRoot,
    'node_modules',
    'webm-muxer',
    'build',
    'webm-muxer.js'
);
const contentsWebMMuxer = fs.existsSync(pathWebMMuxer)
    ? fs.readFileSync(pathWebMMuxer, { encoding: 'utf8' })
    : undefined;

// read optional dependencies for video encoding
const pathMp4Muxer = path.join(projectRoot, 'node_modules', 'mp4-muxer', 'build', 'mp4-muxer.js');
const contentsMp4Muxer = fs.existsSync(pathMp4Muxer)
    ? fs.readFileSync(pathMp4Muxer, { encoding: 'utf8' })
    : undefined;

// read component file
const dest = path.join('bin', src);

if (!fs.existsSync('bin')) fs.mkdirSync('bin');

// modify template
let data = fs.readFileSync(src, { encoding: 'utf8' });

// inject scripts and styles
data = data.replace('/*__PINTURA_CSS__*/', () => contentsPinturaCSS);
data = data.replace('/*__PINTURA_JS__*/', () => contentsPinturaJS);

// if pintura video extension installed
if (contentsPinturaVideoJS) {
    // only if webm or mp4 muxer installed
    let muxerVideoWriterDefault = '';
    let muxerVideoWriter = '';

    // media stream writer
    const mediaStreamVideoWriterDefault = `createDefaultVideoWriter({
    encoder: createMediaStreamEncoder({
        imageStateToCanvas,
    })
})`;

    const mediaStreamVideoWriter = `createDefaultVideoWriter({
    ...(msg.editorOptions.videoWriter || {}),
    encoder: createMediaStreamEncoder({
        ...(msg.editorOptions.videoWriter ? msg.editorOptions.videoWriter.mediaStreamEncoder || {} : {}),
        imageStateToCanvas,
    }),
})
`;

    // if webm muxer installed
    if (contentsWebMMuxer) {
        // replace webm muxer
        data = data.replace('/*__VIDEO_MUXER_JS__*/', () => contentsWebMMuxer);

        // default muxer options
        muxerVideoWriterDefault = `
createDefaultVideoWriter({
    encoder: createMuxerEncoder({
        muxer: WebMMuxer,
        mimeType: 'video/webm',
        imageStateToCanvas,
    })
}),
`;

        // custom muxer options
        muxerVideoWriter = `
createDefaultVideoWriter({
    ...(msg.editorOptions.videoWriter || {}),
    encoder: createMuxerEncoder({
        ...(msg.editorOptions.videoWriter ? msg.editorOptions.videoWriter.muxerEncoder || {} : {}),
        muxer: WebMMuxer,
        mimeType: 'video/webm',
        imageStateToCanvas,
    })
}),
`;
    } else if (contentsMp4Muxer) {
        // replace webm muxer
        data = data.replace('/*__VIDEO_MUXER_JS__*/', () => contentsMp4Muxer);

        // default muxer options
        muxerVideoWriterDefault = `
createDefaultVideoWriter({
    encoder: createMuxerEncoder({
        muxer: Mp4Muxer,
        mimeType: 'video/mp4',
        imageStateToCanvas,
    })
}),
`;

        // custom muxer options
        muxerVideoWriter = `
createDefaultVideoWriter({
    ...(msg.editorOptions.videoWriter || {}),
    encoder: createMuxerEncoder({
        ...(msg.editorOptions.videoWriter ? msg.editorOptions.videoWriter.muxerEncoder || {} : {}),
        muxer: Mp4Muxer,
        mimeType: 'video/mp4',
        imageStateToCanvas,
    })
}),
`;
    }

    // inject scripts and styles
    data = data.replace('/*__PINTURA_VIDEO_CSS__*/', () => contentsPinturaVideoCSS);
    data = data.replace('/*__PINTURA_VIDEO_JS__*/', () => contentsPinturaVideoJS);

    // insert
    data = data
        .replace(
            '/*__PINTURA_VIDEO_INIT__*/',
            () => `
const {
    createDefaultVideoWriter,
    createMuxerEncoder,
    createMediaStreamEncoder,
    plugin_trim,
    plugin_trim_locale_en_gb,
} = pinturavideo;

setPlugins(plugin_trim);
`
        )
        .replace(
            '/*__PINTURA_VIDEO_OPTIONS__*/',
            () => `
locale: {
    ...plugin_trim_locale_en_gb,
},

imageWriter: createDefaultMediaWriter(
    [
        // For handling images
        createDefaultImageWriter(),
        ${muxerVideoWriterDefault}
        ${mediaStreamVideoWriterDefault}
    ]
),
`
        )
        .replace(
            '/*__PINTURA_VIDEO_WRITER__*/',
            () => `
if (msg.editorOptions.imageWriter || msg.editorOptions.videoWriter) {
    msg.editorOptions.imageWriter = createDefaultMediaWriter(
        msg.editorOptions.imageWriter || {},
        [
            createDefaultImageWriter(),
            ${muxerVideoWriter}
            ${mediaStreamVideoWriter}
        ]
    );
}
`
        );
}

// write file in bin
fs.writeFileSync(dest, data, { encoding: 'utf8' });

// copy template to android assets
const androidAssets = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets');
if (!fs.existsSync(androidAssets)) fs.mkdirSync(androidAssets);
fs.copyFileSync(dest, path.join(androidAssets, src)); // overwrites target file
