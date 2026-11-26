class Base64Coder {
    static encodeImage(imageBuffer: Buffer | Uint8Array): string {
        if (imageBuffer instanceof Uint8Array) {
            // Browser environment
            return btoa(
                Array.from(imageBuffer)
                    .map(byte => String.fromCharCode(byte))
                    .join('')
            );
        }
        // Node.js environment (Buffer)
        return (imageBuffer as Buffer).toString('base64');
    }

    static decodeImage(base64String: string): Buffer | Uint8Array {
        if (typeof window !== 'undefined') {
            // Browser environment
            const binaryString = atob(base64String);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        }
        // Node.js environment
        return Buffer.from(base64String, 'base64');
    }

    static encode(data: string): string {
        if (typeof window !== 'undefined') {
            // Browser environment
            return btoa(data);
        }
        // Node.js environment
        return Buffer.from(data).toString('base64');
    }

    static decode(data: string): string {
        if (typeof window !== 'undefined') {
            // Browser environment
            return atob(data);
        }
        // Node.js environment
        return Buffer.from(data, 'base64').toString('utf-8');
    }
}

export default Base64Coder;

/*

- Encoding an image
const imageBuffer = fs.readFileSync('path/to/image.jpg');
const base64Image = Base64Coder.encodeImage(imageBuffer);

- Decoding an image
const decodedImageBuffer = Byte64Coder.decodeImage(base64Image);
fs.writeFileSync('path/to/output.jpg', decodedImageBuffer);

*/