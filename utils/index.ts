
export const loadScript = (src: string, onLoad: () => void): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      onLoad();
      resolve();
    };
    script.onerror = (error) => {
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.body.appendChild(script);
  });
};
