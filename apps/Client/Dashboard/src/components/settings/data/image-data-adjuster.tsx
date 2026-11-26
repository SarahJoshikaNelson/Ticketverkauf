import authFetch from '@/utils/authfetch';
import { getFetchUrl } from '@/utils/getFetchUrl';
import { useKeycloak } from '@react-keycloak/web';
import { useState, useCallback, useEffect } from 'react';
import { Base64Coder } from '@ticket-system/processors';

interface ImageFile {
    id: string;
    file: File;
    preview: string;
}

interface ImageDataAdjusterProps {
    readOnly?: boolean;
}

function ImageDataAdjuster({ readOnly = false }: ImageDataAdjusterProps) {
    const [images, setImages] = useState<ImageFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { keycloak } = useKeycloak();

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        if (readOnly) {
            return;
        }
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter(file => 
            file.type.startsWith('image/')
        );

        const newImages = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            preview: URL.createObjectURL(file)
        }));

        setImages(prev => [...prev, ...newImages]);
    }, [readOnly]);

    const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        if (readOnly) {
            return;
        }
        e.preventDefault();
    }, [readOnly]);

    const removeImage = (id: string) => {
        if (readOnly) {
            return;
        }
        setImages(prev => {
            const imageToRemove = prev.find(img => img.id === id);
            if (imageToRemove) {
                URL.revokeObjectURL(imageToRemove.preview);
            }
            return prev.filter(img => img.id !== id);
        });
    };

    const handleSave = async () => {
        if (readOnly) {
            return;
        }
        setIsLoading(true);
        try {
            // Get all images that need to be encoded (new uploads with real files)
            const imagesToEncode = images.filter(img => img.file.size > 0);
            
            // Get all images that are already encoded (loaded from server)
            const alreadyEncodedImages = images
                .filter(img => img.file.size === 0)
                .map(img => img.preview.replace('data:image/jpeg;base64,', ''));
            
            // Encode new images
            const newlyEncodedImages = await Promise.all(
                imagesToEncode.map(async (image) => {
                    const arrayBuffer = await image.file.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);
                    return Base64Coder.encodeImage(uint8Array);
                })
            );
            
            // Combine all images
            const allEncodedImages = [...alreadyEncodedImages, ...newlyEncodedImages];
            
            console.log('Sending images:', allEncodedImages);
            
            await authFetch(getFetchUrl("api/v2/data/images"), keycloak.token ?? "", {
                method: "POST",
                body: JSON.stringify({
                    images: allEncodedImages
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            }, "POST");

            // Only revoke URLs for newly uploaded images
            imagesToEncode.forEach(image => {
                URL.revokeObjectURL(image.preview);
            });

            // Fetch all images again to ensure we have the complete set
            await fetchImages();
        } catch (error) {
            console.error('Error uploading images:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchImages = async () => {
        try {
            const response = await authFetch(getFetchUrl("api/v2/data/images"), keycloak.token ?? "", {
                method: "GET"
            });
            const base64Images = await response.json();

            console.log(base64Images);
            
            // Convert base64 strings to ImageFile objects
            const imageFiles = base64Images.map((base64: string) => ({
                id: Math.random().toString(36).substr(2, 9),
                preview: `data:image/jpeg;base64,${base64}`,
                file: new File([], '') // Empty file since we don't need it for display
            }));
            
            setImages(imageFiles);

            console.log(images);
        } catch (error) {
            console.error('Error fetching images:', error);
        }
    };

    useEffect(() => {
        fetchImages();
    }, [keycloak.token]);

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Bilder</h1>
            {readOnly && (
                <p className="mb-2 text-sm text-muted-foreground">Bilder können nach Phase 0 nicht mehr bearbeitet werden.</p>
            )}
            <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4"
                onDrop={onDrop}
                onDragOver={onDragOver}
            >
                {images.length === 0 ? (
                    <p className="text-gray-500">
                        Füge Bilder hier ein, oder klicke und wähle Dateien aus
                    </p>
                ) : (
                    <div className="grid grid-cols-3 gap-4">
                        {images.map((image) => (
                            <div key={image.id} className="relative">
                                <img
                                    src={image.preview}
                                    alt="Vorschau"
                                    className="w-full h-32 object-cover rounded"
                                />
                                <button
                                    onClick={() => removeImage(image.id)}
                                    disabled={readOnly}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 disabled:bg-gray-400"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={handleSave}
                disabled={readOnly || isLoading || images.length === 0}
                className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
                {isLoading ? 'Hochladen...' : 'Bilder speichern'}
            </button>
        </div>
    );
}

export default ImageDataAdjuster;