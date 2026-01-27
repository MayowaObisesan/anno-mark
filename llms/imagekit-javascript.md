---
title: JavaScript ImageKit SDK
description: Learn how to use the ImageKit JavaScript SDK for URL generation, responsive images and file uploads.
---

The ImageKit JavaScript SDK provides easy-to-use utility functions for generating optimized image and video URLs, applying a wide range of transformations (resize, crop, overlays, effects, and even AI-powered enhancements), generating responsive images `srcset`, and uploading files. It is designed specifically for browser-based environments. If you are looking to use ImageKit on Node.js, please refer to the [ImageKit Node.js SDK](https://github.com/imagekit-developer/imagekit-nodejs).

The SDK is lightweight, does not require any dependencies, and has first-class TypeScript support. You can view the [source code](https://github.com/imagekit-developer/imagekit-javascript) on GitHub.

## Installation and Setup

Install the SDK via npm or yarn:

```bash
npm install @imagekit/javascript
# or
yarn add @imagekit/javascript
```

You can also include the SDK directly in your HTML using a script tag. It is recommended to load a specific version to avoid unexpected breaking changes:

```html
<script src="https://unpkg.com/@imagekit/javascript@5.0.0/dist/imagekit.min.js"></script>
```

For environments with module bundlers (e.g., webpack, Rollup) or ES modules, simply import the functions:

```js
import { buildSrc, buildTransformationString, upload, getResponsiveImageAttributes } from '@imagekit/javascript';
```

The JavaScript SDK exports the following:

#### Utility functions
- `buildSrc` - To generate complete URLs for images and videos with transformations.
- `buildTransformationString` - To generate transformation strings so that you can use them in your own URL generation logic.
- `upload` - To upload files to ImageKit.
- `getResponsiveImageAttributes` - To generate responsive image attributes for `<img>` tags.

#### Error classes for upload error handling
- `ImageKitInvalidRequestError` - For invalid requests.
- `ImageKitAbortError` - For aborted uploads.
- `ImageKitUploadNetworkError` - For network errors during upload.
- `ImageKitServerError` - For server-side errors.

#### Type definitions
The SDK provides TypeScript type definitions for all the parameters and options used in the SDK. This includes types for `SrcOptions`, `UploadOptions`, `UploadResponse`, `Transformation`, `GetImageAttributesOptions`, and `ResponsiveImageAttributes`.

## URL Generation

The SDK provides two helper functions:
- `buildSrc` - To generate complete URLs for images and videos with transformations.
- `buildTransformationString` - To generate transformation strings so that you can use them in your own URL generation logic.

### buildSrc Parameters

The `buildSrc` function accepts an options object with the following parameters:

{% table %}

- Parameter {% width="30%" %}
- Description and Example {% width="70%" %}

---

- **urlEndpoint**  
  (Required)
- The base URL endpoint from your [ImageKit dashboard](https://imagekit.io/dashboard/url-endpoints).

  Example: `https://ik.imagekit.io/your_imagekit_id`

---

- **src**  
  (Required)
- A relative or absolute path to the image or video.

    - If a **relative path** is provided, it is appended to the `urlEndpoint`.
    - If an **absolute path** is provided, it is used as-is and the `urlEndpoint` is ignored.
    - **Do not include query parameters** directly in the `src`. Use the `queryParameters` prop instead.
    - **When using a web proxy**, you can pass the full URL and prepend it with a `/`. For example - `/https://example.com/image.jpg`.

  **Examples:**  
  Relative - `/default-image.jpg`  
  Absolute - `https://example.com/image.jpg`  
  Web Proxy - `/https://example.com/image.jpg`

---

- **transformation**
- An array of transformation objects. Each object can include properties like `width`, `height`, `rotation`, overlays, and advanced effects.

  Example: `[ { width: 300, height: 300 } ]`

  See all [supported transformation](#supported-transformations) options and how to [handle unsupported transformations](#handling-unsupported-transformations).

---

- **queryParameters**
- An object with additional query parameters to append to the URL.  
  Example: `{ v: 2 }`

---

- **transformationPosition**
- Specifies whether the transformation string is included in the URL path or as a query parameter. Defaults to `"query"`.  
  Example: `"query"` or `"path"`

{% /table %}

### buildTransformationString Parameters

The `buildTransformationString` accepts an array of transformation objects and returns the transformation string.

```js
import { buildTransformationString } from '@imagekit/javascript';
const transformationString = buildTransformationString([
  { width: 300, height: 300 },
  { overlay: { type: "text", text: "Hello World" } }
]);
console.log(transformationString);
// Expected output: "w-300,h-300:l-text,i-Hello%20World,l-end"
```

## Height and Width Transformations

ImageKit allows you to resize images and videos on-the-fly using the `width` and `height` parameters.

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/photo.jpg",
  transformation: [{ width: 300, height: 300 }]
});
```

## Chained Transformations

You can chain multiple transformations together by passing an array of transformation objects. Each object can specify different properties, such as width, height, cropping, overlays, and effects. See [chained transformations](/transformations#chained-transformations) for more details.

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/photo.jpg",
  transformation: [
    { width: 400, height: 300 },
    { rotation: 90 }
  ]
});
```

## Responsive Images

The `getResponsiveImageAttributes()` utility function generates optimized values for `src`, `srcSet`, and optionally `sizes` to be used in `<img>` tags. It adheres to responsive image best practices and employs breakpoint logic similar to Next.js, ensuring that each device downloads the lightest image that still appears sharp.

### getResponsiveImageAttributes Parameters

The `getResponsiveImageAttributes` function accepts all parameters that `buildSrc` accepts, along with the following additional parameters:

{% table %}

- Parameter {% width="30%" %}
- Description and Example {% width="70%" %}

---

- **width**  
  (number)
- The intended display width of the image in pixels. This is used to calculate the `srcSet` attribute and is only utilized when `sizes` is not provided.

  Example: `100`.

---

- **sizes**  
  (string)
- The value for the HTML `sizes` attribute.
    - If it includes one or more vw units, breakpoints smaller than the corresponding percentage of the smallest device width are excluded.
    - If it contains no vw units, the full breakpoint list is used.

  Example: `"100vw"` or `"(min-width:768px) 50vw, 100vw"`

---

- **deviceBreakpoints**  
  (number[])
- It allows you to specify a list of device width breakpoints.

  Defaults to `[640, 750, 828, 1080, 1200, 1920, 2048, 3840]`.

---

- **imageBreakpoints**  
  (number[])
- It allows you to specify a list of image width breakpoints. It is concatenated with `deviceBreakpoints` before calculating `srcSet`.

  Defaults to `[16, 32, 48, 64, 96, 128, 256, 384]`.

{% /table %}

### Responsive Image Logic

The logic for generating responsive images is as follows:

* If only `width` is provided, the function uses a DPR (Device Pixel Ratio)-based strategy. It rounds the specified width up to the nearest available breakpoint and generates two image candidates—one for `1×` and one for `2×` pixel densities. The resulting `srcSet` uses x-descriptors, and the `width` value is included in the returned object.
* If `sizes` is provided, the function follows a width-based strategy. It parses the smallest `%vw` value from the sizes string to determine the minimum required image width. Breakpoints smaller than this calculated value are excluded from the `srcSet`. The output uses a w-descriptor, and any value passed in the `width` parameter is ignored. Remember that `imageBreakpoints` is concatenated with `deviceBreakpoints` before calculating the `srcSet`.
* If neither `sizes` nor `width` is provided, the function defaults to using the full list of device breakpoints. In this case, the sizes attribute is set to `100vw` automatically, and a w-descriptor `srcSet` is generated using all available breakpoints.

### Recommended Responsive Image Usage

Specify `width` in pixels and `sizes` in `vw` units. This is the recommended way to use responsive images.

```js
const out = getResponsiveImageAttributes({
  src: 'sample.jpg',
  urlEndpoint: 'https://ik.imagekit.io/demo',
  width: 400,
  sizes: '(min-width:800px) 33vw, 100vw',
});
```

The output will look like this:

```bash
{
  src: "https://ik.imagekit.io/demo/sample.jpg?tr=w-3840,c-at_max",
  srcSet: "https://ik.imagekit.io/demo/sample.jpg?tr=w-256,c-at_max 256w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-384,c-at_max 384w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-640,c-at_max 640w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-750,c-at_max 750w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-828,c-at_max 828w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-1080,c-at_max 1080w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-1200,c-at_max 1200w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-1920,c-at_max 1920w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-2048,c-at_max 2048w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-3840,c-at_max 3840w",
  sizes: "(min-width: 800px) 33vw, 100vw"
}
```

If neither `width` nor `sizes` is specified, the SDK will generate a `srcSet` using all available device breakpoints. The `sizes` attribute will default to `100vw`, assuming the image should span the full viewport width.

```js
const out = getResponsiveImageAttributes({
  src: 'sample.jpg',
  urlEndpoint: 'https://ik.imagekit.io/demo',
});
```

Expected output:

```bash
{
  src: "https://ik.imagekit.io/demo/sample.jpg?tr=w-3840,c-at_max",
  srcSet: "https://ik.imagekit.io/demo/sample.jpg?tr=w-640,c-at_max 640w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-750,c-at_max 750w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-828,c-at_max 828w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-1080,c-at_max 1080w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-1200,c-at_max 1200w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-1920,c-at_max 1920w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-2048,c-at_max 2048w, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-3840,c-at_max 3840w",
  sizes: "100vw"
}
```

If you specify a `width` but omit `sizes`, the SDK will generate a `srcSet` using `1x` and `2x` descriptors based on the nearest matching breakpoints.

```js
const out = getResponsiveImageAttributes({
  src: 'sample.jpg',
  urlEndpoint: 'https://ik.imagekit.io/demo',
  width: 400,
});
```

The output will look like this:

```bash
{
  src: "https://ik.imagekit.io/demo/sample.jpg?tr=w-828,c-at_max",
  srcSet: "https://ik.imagekit.io/demo/sample.jpg?tr=w-640,c-at_max 1x, 
           https://ik.imagekit.io/demo/sample.jpg?tr=w-828,c-at_max 2x",
  width: 400
}
```

## Adding Overlays
You can add overlays to images and videos. The overlay can be a text, image, video, or subtitle.

Besides the overlay type, you can also specify the position, size, and other properties of the overlay. Check the [overlay options](#overlay-reference) for more details.

### Image Overlay

```js
// Image overlay example:
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/background.jpg",
  transformation: [
    { 
      overlay: { 
        type: "image", 
        input: "logo.png"
      } 
    }
  ]
});
```

You can further transform the overlay image independently of the base image by adding additional transformation parameters. For example, to resize the overlay image:

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/background.jpg",
  transformation: [
    { 
      overlay: { 
        type: "image", 
        input: "logo.png", 
        transformation: [
          { width: 100, height: 100 }
        ]
      } 
    }
  ]
});
```

Image overlays support a wide range of transformations. Check [reference](/add-overlays-on-images#list-of-supported-image-transformations-in-image-layers) for a complete list of transformations supported on image overlays.

### Solid Color Overlay

You can add a solid color overlay to images and videos.

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/background.jpg",
  transformation: [
    { 
      overlay: { 
        type: "solidColor", 
        color: "FF0000" // Required
      } 
    }
  ]
});
```

You can also specify the width, height, and other properties of the solid color overlay. For example:

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/background.jpg",
  transformation: [
    { 
      overlay: { 
        type: "solidColor", 
        color: "FF0000", // Required
        transformation: [
          { width: 100, height: 100 }
        ]
      } 
    }
  ]
});
```

For more options related to styling the solid color overlay, check the [solid color overlay transformations](#solid-color-overlay-transformations) section.

### Text Overlay

You can add text overlays to images and videos.

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/background.jpg",
  transformation: [
    { 
      overlay: { type: "text", text: "Hello, ImageKit!" } 
    }
  ]
});
```

You can also specify the font size, color, and other properties of the text overlay. For example:

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/background.jpg",
  transformation: [
    { 
      overlay: { 
        type: "text", 
        text: "Hello, ImageKit!", 
        transformation: [
          { fontSize: 20, fontColor: "FF0000" }
        ]
      } 
    }
  ]
});
```

Check the [text overlay transformations](#text-overlay-transformations) section for more options related to styling the text.

### Video Overlay

You can add video overlays on videos only.

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/background.mp4",
  transformation: [
    { 
      overlay: { 
        type: "video", 
        input: "video.mp4"
      } 
    }
  ]
});
```

Additionally, you can specify the start and end time for the overlay video. For example:

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/background.mp4",
  transformation: [
    { 
      overlay: { 
        type: "video", 
        input: "video.mp4", 
        timing: { start: 5, duration: 10 } // Overlay appears at 5 seconds and lasts for 10 seconds
      } 
    }
  ]
});
```

You can also independently transform the overlay video. For example, to resize the overlay video:

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/background.mp4",
  transformation: [
    { 
      overlay: { 
        type: "video", 
        input: "video.mp4", 
        transformation: [
          { width: 100, height: 100 } // Resize overlay video independently
        ] 
      } 
    }
  ]
});
```

All supported [video transformations](/video-transformation) can also be applied to overlay videos.

If you're overlaying an image on a base video, refer to [this list](/add-overlays-on-videos#list-of-transformations-supported-on-image-overlay) for all the transformations supported on image overlays.

### Subtitle Overlay

You can add subtitle overlays on videos.

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/background.mp4",
  transformation: [
    { 
      overlay: { type: "subtitle", input: "subtitle.srt" } 
    }
  ]
});
```

The subtitle overlay can be styled with various properties such as font size, color, and outline. See the [Subtitle Overlay Transformations](#subtitle-overlay-transformations) section for all styling options.

## Background Removal Using AI

You can use the `aiRemoveBackground` transformation to remove the background from images. This is particularly useful for e-commerce applications.

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/photo.jpg",
  transformation: [{ aiRemoveBackground: true }]
});
```

ImageKit supports multiple AI-powered transformations, like upscaling, generative fill, and more. You can use these transformations to enhance your images without needing to manually edit them. Check the [AI Transformations](/ai-transformations) section for more details.

More examples:

```js
// Drop shadow using AI
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/photo.jpg",
  transformation: [{ aiDropShadow: true }]
});

// Upscale a small image using AI
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/photo.jpg",
  transformation: [{ aiUpscale: true }]
});
```

## Arithmetic Expressions

You can use arithmetic expressions to dynamically compute transformation values. For example, to set the width to half of the original image width:

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/photo.jpg",
  transformation: [{ width: "iw_div_2" }]
});
```

Check out the [Arithmetic Expressions](/arithmetic-expressions-in-transformations) reference for more examples and details.


## Uploading Files

The `upload()` function enables you to upload files to ImageKit using [upload V1 API](/api-reference/upload-file/upload-file). It accepts an options object and returns a promise that resolves with an upload response. The SDK JSON stringifies certain parameters before sending them to the server as expected by the API. If the SDK does not support a parameter, it is added as-is in the request. Check the API documentation for more details.

### upload() Parameters

The `upload()` function accepts a JSON object with the following parameters:

{% table %}

- Option {% width="30%" %}
- Description and Example {% width="70%" %}

---

- **file**  
  (Required)
- The file content to be uploaded. Accepts binary data, a base64-encoded string, or a URL. Typically used with a File or Blob in the browser. Example: `file: fileInput.files[0]`

---

- **fileName**  
  (Required)
- The name to assign to the uploaded file. Supports alphanumeric characters, dot, underscore, and dash. Any other character is replaced with `_`. Example: `fileName: "myImage.jpg"`

---

- **signature**  
  (Required)
- The HMAC-SHA1 digest of the concatenation of "token + expire". The signing key is your ImageKit private API key. Must be computed on the server side. Example: `signature: "generated_signature"`

---

- **token**  
  (Required)
- A unique value to identify and prevent replays. Typically a UUID (e.g., version 4). Example: `token: "unique_upload_token"`

  Check the [signature generation](#signature-generation) section for more details on how to generate this value.

---

- **expire**  
  (Required)
- A Unix timestamp in seconds, less than 1 hour in the future. Example: `expire: 1616161616`

  Check the [signature generation](#signature-generation) section for more details on how to generate this value.

---

- **publicKey**  
  (Required)
- The public API key for your ImageKit account. This is used to identify the account making the upload request. Example: `publicKey: "your_public_api_key"`

  Check the [signature generation](#signature-generation) section for more details on how to generate this value.

---

- **onProgress**
- A callback function to track the upload progress. It receives an event object with `loaded` and `total` properties. Example: `onProgress: (event) => console.log(event.loaded, event.total)`
  This is useful for showing upload progress to the user.

---
- **abortSignal**
- An optional `AbortSignal` object to abort the upload request. If the signal is already aborted, the upload will fail immediately.
  You can create an `AbortController` instance and pass its signal to the `upload()` function.

---

- **useUniqueFileName**
- Boolean flag to automatically generate a unique filename if set to true. Defaults to true. If false, the image is uploaded with the provided filename, replacing any existing file with the same name. Example: `useUniqueFileName: true`

---

- **folder**
- The folder path where the file will be stored, e.g., "/images/folder/". If the path doesn't exist, it is created on-the-fly. Example: `folder: "/images/uploads"`

---

- **isPrivateFile**
- Boolean to mark the file as private, restricting access to the original file URL. A private file requires signed URLs or named transformations for access. Defaults to false. Example: `isPrivateFile: false`

---

- **tags**
- Optionally set tags on the uploaded file. Can be a comma-separated string or an array of tags. Example: `tags: "summer,holiday"` or `tags: ["summer","holiday"]`

---

- **customCoordinates**
- A string in "x,y,width,height" format that defines the region of interest in an image (top-left coords and area size). Example: `customCoordinates: "10,10,100,100"`

---

- **responseFields**
- A comma-separated or array-based set of fields to return in the upload response. Example: `responseFields: "tags,customCoordinates"`

---

- **extensions**
- An array of extension objects to apply to the image, e.g., background removal, auto-tagging, etc. Example: `extensions: [{ name: "auto-tagging" }]`

---

- **webhookUrl**
- A webhook URL to receive the final status of any pending extensions once they've completed processing. Example: `webhookUrl: "https://example.com/webhook"`

---

- **overwriteFile**
- Defaults to true. If false, and "useUniqueFileName" is also false, the API immediately fails if a file with the same name/folder already exists. Example: `overwriteFile: true`

---

- **overwriteAITags**
- Defaults to true. If true, and an existing file is found at the same location, its AITags are removed. Set to false to keep existing AITags. Example: `overwriteAITags: true`

---

- **overwriteTags**
- Defaults to true. If no tags are specified in the request, existing tags are removed from overwritten files. Setting to false has no effect if the request includes tags. Example: `overwriteTags: true`

---

- **overwriteCustomMetadata**
- Defaults to true. If no customMetadata is specified in the request, existing customMetadata is removed from overwritten files. Setting to false has no effect if the request specifies customMetadata. Example: `overwriteCustomMetadata: true`

---

- **customMetadata**
- A stringified JSON or an object containing custom metadata fields to store with the file. Custom metadata fields must be pre-defined in your ImageKit configuration. Example: `customMetadata: {author: "John Doe"}`

---

- **transformation**
- Defines pre and post transformations to be applied to the file during upload. The SDK enforces certain validation rules for pre/post transformations. Example: `transformation: { pre: "w-200,h-200", post: [...] }`

---

- **xhr**
- An optional XMLHttpRequest instance for the upload. The SDK merges it with its own logic to handle progress events, etc. Example: `xhr: new XMLHttpRequest()`

---

- **checks**
- A string specifying the checks to be performed server-side before uploading to the media library, e.g., size or mime type checks. Example: `checks: "file.size' < '1MB'"`

{% /table %}

## Upload Example and Error Handling

The `.upload` function requires you to send `token`, `signature`, `expire` and `publicKey` parameters. Check the [signature generation](#signature-generation) section for more details on how to generate these values.

```js
import { upload, ImageKitInvalidRequestError, ImageKitAbortError, ImageKitUploadNetworkError, ImageKitServerError } from '@imagekit/javascript';

const fileInput = document.getElementById('fileInput');
const abortController = new AbortController(); // You can abort the upload using abortController.abort();

// Get required token, signature, and expire values from your server. Check the signature generation below for more details.

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const uploadOptions = {
    file,
    fileName: file.name,
    token: "your_upload_token", // Check signature generation section for more details
    signature: "your_generated_signature",
    expire: Math.floor(Date.now() / 1000) + 3600,
    publicKey: "your_public_key",
    onProgress: (event) => {
      console.log(`Progress: ${event.loaded}/${event.total}`);
    },
    abortSignal: abortController.signal
  };
  
  try {
    const response = await upload(uploadOptions);
    console.log("Upload successful:", response);
  } catch (error) {
    if (error instanceof ImageKitAbortError) {
      // You aborted the upload
      console.error("Upload aborted:", error.reason);
    } else if (error instanceof ImageKitInvalidRequestError) {
      // You made an invalid request
      console.error("Invalid request:", error.message);
    } else if(error instanceof ImageKitUploadNetworkError) {
      // Random network error on client side
      console.error("Network error:", error.message);
    } else if (error instanceof ImageKitServerError) {
      // Error on ImageKit server side (5xx). Usually rare and temporary.
      console.error("Server error:", error.message);
    } else {
      // Any other error. You love JavaScript, right?
      console.error("Upload error:", error);
    }
  }
});
```

## Signature Generation

The `.upload` function requires you to send `token`, `signature`, and `expire` parameters. These are used to authenticate the upload request. These values should be generated in your secure backend server and passed to the client. The SDK does not generate these values for you. However, all ImageKit SDKs (Java, PHP, Node.js, Python, Ruby, etc.) provide methods to generate these values. You can use any of these SDKs to generate the signature and token.

Check the [upload API documentation](/api-reference/upload-file/upload-file#how-to-implement-client-side-file-upload) for more details on how to generate the signature and token.

{% callout style="alert" %}
Never expose your private API key in the client-side code. Always generate the `token`, `signature`, and `expire` values on your server and pass them to the client securely.
{% /callout %}

Sample code to generate the signature and token:

{% tabs %}
{% tab title="Node.js" %}
```js
import ImageKit from '@imagekit/nodejs';

const client = new ImageKit({
    privateKey: "your_private_api_key"
});

const { token, expire, signature } = client.helper.getAuthenticationParameters();
console.log({token, expire, signature});
```
{% /tab %}

{% tab title="Go" %}
```go
import (
	"fmt"

	"github.com/imagekit-developer/imagekit-go/v2"
	"github.com/imagekit-developer/imagekit-go/v2/option"
)

client := imagekit.NewClient(
	option.WithPrivateKey("your_private_api_key"),
)

// Generate authentication parameters for client-side uploads
authParams, err := client.Helper.GetAuthenticationParameters("", 0)
if err != nil {
	fmt.Printf("Error: %v\n", err)
	return
}

fmt.Printf("Token: %v\n", authParams["token"])
fmt.Printf("Expire: %v\n", authParams["expire"])
fmt.Printf("Signature: %v\n", authParams["signature"])
```
{% /tab %}

{% tab title="Python" %}
```python
import os
from imagekitio import ImageKit

imagekit = ImageKit(
    private_key=os.environ.get("IMAGEKIT_PRIVATE_KEY")
)

auth_params = imagekit.helper.get_authentication_parameters()
print(auth_params)
# Output: {'token': 'unique_token', 'expire': <timestamp>, 'signature': 'generated_signature'}
```
{% /tab %}

{% tab title="Ruby" %}
```ruby
require 'imagekitio'

client = Imagekitio::Client.new(private_key: "your_private_api_key")

auth_params = client.helper.get_authentication_parameters
puts auth_params
# Output: {token: "unique_token", expire: <timestamp>, signature: "generated_signature"}
```
{% /tab %}
{% /tabs %}

## Supported Transformations

The SDK gives a name to each transformation parameter (e.g. `height` maps to `h`, `width` maps to `w`). If the property does not match any of the following supported options, it is added as is in the URL.

If you want to generate transformations without any modifications, use the `raw` parameter. For example, the SDK doesn't provide a nice way to write [conditional transformations](/conditional-transformations), so you can use the `raw` parameter to add them as is.

Check [transformation documentation](/transformations) for a complete reference on all transformations supported by ImageKit.

| Transformation Name        | URL Parameter                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| width                      | w                                                                                              |
| height                     | h                                                                                              |
| aspectRatio                | ar                                                                                             |
| quality                    | q                                                                                              |
| aiRemoveBackground         | e-bgremove (ImageKit powered)                                                                  |
| aiRemoveBackgroundExternal | e-removedotbg (Using third party)                                                              |
| aiUpscale                  | e-upscale                                                                                      |
| aiRetouch                  | e-retouch                                                                                      |
| aiVariation                | e-genvar                                                                                       |
| aiDropShadow               | e-dropshadow                                                                                   |
| aiChangeBackground         | e-changebg                                                                                     |
| crop                       | c                                                                                              |
| cropMode                   | cm                                                                                             |
| x                          | x                                                                                              |
| y                          | y                                                                                              |
| xCenter                    | xc                                                                                             |
| yCenter                    | yc                                                                                             |
| focus                      | fo                                                                                             |
| format                     | f                                                                                              |
| radius                     | r                                                                                              |
| background                 | bg                                                                                             |
| border                     | b                                                                                              |
| rotation                   | rt                                                                                             |
| blur                       | bl                                                                                             |
| named                      | n                                                                                              |
| dpr                        | dpr                                                                                            |
| progressive                | pr                                                                                             |
| lossless                   | lo                                                                                             |
| trim                       | t                                                                                              |
| metadata                   | md                                                                                             |
| colorProfile               | cp                                                                                             |
| defaultImage               | di                                                                                             |
| original                   | orig                                                                                           |
| videoCodec                 | vc                                                                                             |
| audioCodec                 | ac                                                                                             |
| grayscale                  | e-grayscale                                                                                    |
| contrastStretch            | e-contrast                                                                                     |
| shadow                     | e-shadow                                                                                       |
| sharpen                    | e-sharpen                                                                                      |
| unsharpMask                | e-usm                                                                                          |
| gradient                   | e-gradient                                                                                     |
| flip                       | fl                                                                                             |
| opacity                    | o                                                                                              |
| zoom                       | z                                                                                              |
| page                       | pg                                                                                             |
| startOffset                | so                                                                                             |
| endOffset                  | eo                                                                                             |
| duration                   | du                                                                                             |
| streamingResolutions       | sr                                                                                             |
| overlay                    | Generates the correct layer syntax for image, video, text, subtitle, and solid color overlays. |
| raw                        | The string provided in raw will be added in the URL as is.                                     |

## Handling Unsupported Transformations

If you specify a transformation parameter that is not explicitly supported by the SDK, it is added “as-is” in the generated URL. This provides flexibility for using new or custom transformations without waiting for an SDK update.

For example:

```js
buildSrc({
  urlEndpoint: "https://ik.imagekit.io/your_imagekit_id",
  src: "/photo.jpg",
  transformation: [
    { unsupportedTransformation: "value" }
  ]
});
// Output: https://ik.imagekit.io/your_imagekit_id/photo.jpg?tr=unsupportedTransformation-value
```

## Overlay Reference

This SDK provides `overlay` as a transformation parameter. The overlay can be a text, image, video, subtitle, or solid color.

Overlays in ImageKit are applied using layers, allowing you to stack multiple overlays on top of each other. Each overlay can be styled and positioned independently. For more details, refer to the [layer documentation](/transformations#overlay-using-layers).

The SDK automatically generates the correct layer syntax for image, video, text, subtitle, and solid color overlays. You can also specify the overlay position, size, and other properties.

The table below outlines the available overlay configuration options:

{% table %}

- Option {% width="30%" %}
- Description and Example {% width="70%" %}

---

- **type**  
  (Required)
- Specifies the type of overlay. Supported values: `text`, `image`, `video`, `subtitle`, `solidColor`. Example: `type: "text"`

---

- **text**  
  (Required for text overlays)
- The text content to display. Example: `text: "ImageKit"`

---

- **input**  
  (Required for image, video, or subtitle overlays)
- Relative path to the overlay asset. Example: `input: "logo.png"` or `input: "overlay-video.mp4"`

---

- **color**  
  (Required for solidColor overlays)
- RGB/RGBA hex code or color name for the overlay color. Example: `color: "FF0000"`

---

- **encoding**
- Accepted values: `auto`, `plain`, `base64`. [Check this](#encoding-options) for more details. Example: `encoding: "auto"`

---

- **transformation**
- An array of transformation objects to style the overlay independently of the base asset. Each overlay type has its own set of supported transformations.
    - For example, for text overlays, you can specify `fontSize`, `fontColor`, `background`, etc. Example: `transformation: [{ fontSize: 20, fontColor: "FF0000" }]`. Check out the [text overlay transformations](#text-overlay-transformations) section for more options.
    - For image overlays, you can specify `width`, `height`, `radius`, etc. Example: `transformation: [{ width: 100, height: 100 }]`. Check [reference](/add-overlays-on-images#list-of-supported-image-transformations-in-image-layers) for complete list of transformations supported on image overlays.
    - For video overlays, you can specify `width`, `height`, `rotation`, etc. Example: `transformation: [{ width: 100, height: 100 }]`. Check [reference](/add-overlays-on-videos#list-of-transformations-supported-on-image-overlay) for complete list of transformations supported on video overlays.
    - For subtitle overlays, you can specify `fontSize`, `fontColor`, `background`, etc. Example: `transformation: [{ fontSize: 20, fontColor: "FF0000" }]`. Check out the [subtitle overlay transformations](#subtitle-overlay-transformations) section for more options.
    - For solid color overlays, you can specify `width`, `height`, `radius`, etc. Example: `transformation: [{ width: 100, height: 100 }]`. Check out the [solid color overlay transformations](#solid-color-overlay-transformations) section for more options.

---

- **position**
- Sets the overlay’s position relative to the base asset. Accepts an object with `x`, `y`, or `focus`. Example: `position: { x: 10, y: 20 }` or `position: { focus: "center" }`

---

- **timing**
- (For video base) Specifies when the overlay appears using `start`, `duration`, and `end` (in seconds); if both `duration` and `end` are set, `duration` is ignored. Example: `timing: { start: 5, duration: 10 }`

{% /table %}

### Encoding Options

Overlay encoding options define how the overlay input is converted for URL construction. When set to `auto`, the SDK automatically determines whether to use plain text or Base64 encoding based on the input content.

For text overlays:
- If `auto` is used, the SDK checks the text overlay input: if it is URL-safe, it uses the format `i-{input}` (plain text); otherwise, it applies Base64 encoding with the format `ie-{base64_encoded_input}`.
- You can force a specific method by setting encoding to `plain` (always use `i-{input}`) or `base64` (always use `ie-{base64}`).
- Note: In all cases, the text is percent-encoded to ensure URL safety.

For image, video, and subtitle overlays:
- The input path is processed by removing any leading/trailing slashes and replacing inner slashes with `@@` when `plain` is used.
- Similarly, if `auto` is used, the SDK determines whether to apply plain text or Base64 encoding based on the characters present.
- For explicit behavior, use `plain` or `base64` to enforce the desired encoding.

Use `auto` for most cases to let the SDK optimize encoding, and use `plain` or `base64` when a specific encoding method is required.

### Solid Color Overlay Transformations

| Option     | Description                                                                                                                                                                                                                   | Example             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| width      | Specifies the width of the solid color overlay block (in pixels or as an arithmetic expression).                                                                                                                              | `width: 100`        |
| height     | Specifies the height of the solid color overlay block (in pixels or as an arithmetic expression).                                                                                                                             | `height: 50`        |
| radius     | Specifies the corner radius of the solid color overlay block or shape. Can be a number or `"max"` for circular/oval shapes.                                                                                                   | `radius: "max"`     |
| alpha      | Specifies the transparency level of the solid color overlay. Supports integers from 1 (most transparent) to 9 (least transparent).                                                                                            | `alpha: 5`          |
| background | Specifies the background color of the solid color overlay. Accepts an RGB hex code, an RGBA code, or a standard color name.                                                                                                   | `background: "red"` |
| gradient   | Only works if base asset is an image. Creates a linear gradient with two colors. Pass `true` for a default gradient, or provide a string for a custom gradient. [Learn more](/effects-and-enhancements#gradient---e-gradient) | `gradient: true`    |

### Text Overlay Transformations

| Option         | Description                                                                                                                                                              | Example                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| width          | Specifies the maximum width (in pixels) of the overlaid text. The text wraps automatically, and arithmetic expressions are supported (e.g., `bw_mul_0.2` or `bh_div_2`). | `width: 400`               |
| fontSize       | Specifies the font size of the overlaid text. Accepts a numeric value or an arithmetic expression.                                                                       | `fontSize: 50`             |
| fontFamily     | Specifies the font family of the overlaid text. Choose from the supported fonts or provide a custom font.                                                                | `fontFamily: "Arial"`      |
| fontColor      | Specifies the font color of the overlaid text. Accepts an RGB hex code, an RGBA code, or a standard color name.                                                          | `fontColor: "FF0000"`      |
| innerAlignment | Specifies the inner alignment of the text when it doesn’t occupy the full width. Supported values: `left`, `right`, `center`.                                            | `innerAlignment: "center"` |
| padding        | Specifies the padding around the text overlay. Can be a single integer or multiple values separated by underscores; arithmetic expressions are accepted.                 | `padding: 10`              |
| alpha          | Specifies the transparency level of the text overlay. Accepts an integer between `1` and `9`.                                                                            | `alpha: 5`                 |
| typography     | Specifies the typography style of the text. Supported values: `b` for bold, `i` for italics, and `b_i` for bold with italics.                                            | `typography: "b"`          |
| background     | Specifies the background color of the text overlay. Accepts an RGB hex code, an RGBA code, or a color name.                                                              | `background: "red"`        |
| radius         | Specifies the corner radius of the text overlay. Accepts a numeric value or `max` for circular/oval shape.                                                               | `radius: "max"`            |
| rotation       | Specifies the rotation angle of the text overlay. Accepts a numeric value for clockwise rotation or a string prefixed with `N` for counterclockwise rotation.            | `rotation: 90`             |
| flip           | Specifies the flip option for the text overlay. Supported values: `h`, `v`, `h_v`, `v_h`.                                                                                | `flip: "h"`                |
| lineHeight     | Specifies the line height for multi-line text. Accepts a numeric value or an arithmetic expression.                                                                      | `lineHeight: 20`           |

### Subtitle Overlay Transformations

| Option      | Description                                                                                               | Example                 |
| ----------- | --------------------------------------------------------------------------------------------------------- | ----------------------- |
| background  | Specifies the subtitle background color using a standard color name, RGB color code, or RGBA color code.  | `background: "blue"`    |
| fontSize    | Sets the font size of subtitle text.                                                                      | `fontSize: 16`          |
| fontFamily  | Sets the font family of subtitle text.                                                                    | `fontFamily: "Arial"`   |
| color       | Specifies the font color of subtitle text using standard color name, RGB, or RGBA color code.             | `color: "FF0000"`       |
| typography  | Sets the typography style of subtitle text. Supported values: `b`, `i`, `b_i`.                            | `typography: "b"`       |
| fontOutline | Specifies the font outline for subtitles. Requires an outline width and color separated by an underscore. | `fontOutline: "2_blue"` |
| fontShadow  | Specifies the font shadow for subtitles. Requires shadow color and indent separated by an underscore.     | `fontShadow: "blue_2"`  |
