import { t } from "i18next";

export const Animate = (obj, name, time) => {
    const element = document.querySelector(obj);
    if (!element) return;

    let speed = localStorage.getItem('S-AnimSpeed');
    if (speed) {
        speed = parseInt(speed);
        if (speed !== 5) {
            if (speed < 5) {
                time = time * speed * 0.2;
            } else {
                time = time * speed * 0.5;
            }
        }
    }
    element.style.animation = name + ' ' + time + 's forwards';
}
export const AnimateElement = (obj, name, time) => {
    let speed = localStorage.getItem('S-AnimSpeed');
    if (speed) {
        speed = parseInt(speed);
        if (speed !== 5) {
            if (speed < 5) {
                time = time * speed * 0.2;
            } else {
                time = time * speed * 0.5;
            }
        }
    }
    obj.style.animation = name + ' ' + time + 's forwards';
}

export const downloadBlob = (blob: Blob, filename: string = 'downloaded_file') => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        document.body.removeChild(link);
    }, 100);
};

export const getReportCategoryText = (category: string): string => {
    const translation = t(`report_reasons.${category}`);
    return translation ?? category;
};

export const imageToBase64 = (image: File | null): Promise<string | null> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            resolve(reader.result as string | null);
        };
        reader.onerror = reject;

        if (image) {
            reader.readAsDataURL(image);
        }
    });
};