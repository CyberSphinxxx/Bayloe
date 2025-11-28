declare module 'heic2any' {
    function heic2any(options: {
        blob: Blob;
        toType?: string;
        quality?: number;
        gifInterval?: number;
        multiple?: boolean;
    }): Promise<Blob | Blob[]>;
    export default heic2any;
}
