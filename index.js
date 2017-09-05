'use strict'

const GM = require('gm').subClass({ imageMagick: true })
const Jimp = require('jimp')
const FileSystem = require('fs')

function rejectError (reject, err) {
  return reject('end with error' + err.toString())
}

async function readFilePromise (filepath)  {
  return new Promise((resolve, reject) => {
    return FileSystem.readFile(filepath, (err, data) => {
      if (err) return rejectError(reject, err)
      return resolve(data)
    })
  })
}

async function writeFilePromise (filepath, data) {
  return new Promise((resolve, reject) => {
    return FileSystem.writeFile(filepath, data, (err) => {
      if (err) return rejectError(reject, err)
      return resolve({ ok: true })
    })
  })
}

async function ResizeImageMagick (args) {
  let image = GM(args.buffer)
    .resize(args.width, args.height, args.crop ? '^' : void 0)
    .gravity(args.gravity)

  if (args.crop) {
    image = image.crop(args.width, args.height, 0, 0)
  }
  
  return new Promise((resolve, reject) => {
    image.toBuffer('PNG', (err, buffer) => {
      if (err) rejectError(reject, err)
      return resolve(buffer)
    })
  })
}

async function ResizeJimp (args) {
  return Promise.resolve(
      args.image.resize(args.width, args.height
  ))
}

async function createBufferFromJimpInstance (image) {
  return new Promise((resolve, reject) => {
    image.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
      if (err) rejectError(reject, err)
      return resolve(buffer)
    })
  })
}

async function createJimpInstanceFromBuffer (buffer) {
  return new Promise((resolve, reject) => {
    return new Jimp(buffer, (err, image) => {
      if (err) rejectError(reject, err)
      return resolve(image)
    })
  })
}


async function createBlankBackground (options) {
  return new Promise((resolve, reject) => {
    new Jimp(options.width, options.height, 0xFFFFFFFF, (err, image) => {
      if (err) return rejectError(reject, err)
      if (options.toBuffer) {
        return createBufferFromJimpInstance(image)
          .then(buffer => resolve(buffer))
      }
      return resolve(image)
    })
  })
}

async function compositeImages (options) {
  return new Promise((resolve, reject) => {
    const background = options.background
    const foreground = options.foreground
    const x = options.x < 0 ? Math.abs(options.x) : options.x
    const y = options.y < 0 ? Math.abs(options.y) : options.y
    return resolve(background.composite(foreground, x, y))
  })
}

async function writeJimpInstance (filepath, image) {
  return new Promise((resolve, reject) => {
    image.write(filepath, (err) => {
      if (err) return rejectError(reject, err)
      return resolve({ ok: true })
    })
  })
}


(async function constructor () {
  const options = {
    resize: {
      width: 150,
      height: 150
    },
    blankBackground: {
      width: 350,
      height: 350
    },
    composite: {
      x: 0,
      y: 0
    }
  }

  const entryPoint = process.argv[2] || './img.jpg'
  const endPoint = process.argv[3] || './final-image.png'

  const ImageBuffer = await readFilePromise(entryPoint)

  // const ImageResized = await ResizeJimp({
  //   image: await createJimpInstanceFromBuffer(ImageBuffer),
  //   width: options.resize.width,
  //   height: options.resize.height
  // })
  // const Foreground = ImageResized

  let ImageResized = await ResizeImageMagick({
    buffer: ImageBuffer,
    width: 300,
    height: 300
  })
  const Foreground = await createJimpInstanceFromBuffer(ImageResized)
  const BlankBackground = await createBlankBackground(options.blankBackground)

  const CompositeImage = await compositeImages({
    background: BlankBackground,
    foreground: Foreground,
    x: options.composite.x,
    y: options.composite.y
  })
  
  const CompositeBuffer = await createBufferFromJimpInstance(CompositeImage)
  const imageSaved = await writeFilePromise(endPoint, CompositeBuffer)

  console.log('backgroundImage', BlankBackground)
  console.log('CompositeImage', CompositeImage)
  console.log('CompositeBuffer', CompositeBuffer)
  console.log('ImageSaved', imageSaved)

  return Promise.resolve(imageSaved)
})().then(response => console.log('the', response))
