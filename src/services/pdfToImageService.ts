import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker to use local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export interface PdfPageImage {
  pageNumber: number;
  imageData: Uint8Array;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
}

export class PdfToImageService {
  /**
   * Convert a PDF buffer to an array of page images
   */
  async convertPdfToImages(
    pdfBuffer: ArrayBuffer,
    options: {
      scale?: number;
      format?: 'png' | 'jpeg';
      quality?: number;
      maxPages?: number;
      password?: string;
    } = {}
  ): Promise<PdfPageImage[]> {
    const {
      scale = 1.5,
      format = 'png',
      quality = 0.9,
      maxPages = 10,
      password
    } = options;

    try {
      console.log('📄 Starting PDF to image conversion...');
      
      // Ensure we have a valid ArrayBuffer and create a copy to prevent detachment issues
      if (!pdfBuffer) {
        throw new Error('Invalid PDF buffer: buffer is null or undefined');
      }
      
      if (pdfBuffer.byteLength === 0) {
        throw new Error('Invalid PDF buffer: buffer is empty');
      }
      
      // Check if the buffer is detached
      try {
        new Uint8Array(pdfBuffer);
      } catch (error) {
        throw new Error('Invalid PDF buffer: buffer is detached or corrupted');
      }
      
      // Create a copy of the buffer to prevent detachment issues
      const bufferCopy = pdfBuffer.slice(0);
      
      // Load the PDF document
      console.log(`🔐 Attempting to load PDF with password: ${password ? 'provided' : 'none'}`);
      const loadingTask = pdfjsLib.getDocument({ 
        data: bufferCopy,
        password: password
      });
      const pdf = await loadingTask.promise;
      
      console.log(`📄 PDF loaded: ${pdf.numPages} pages`);
      
      const images: PdfPageImage[] = [];
      const pagesToProcess = Math.min(pdf.numPages, maxPages);
      
      // Process each page
      for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
        console.log(`🔄 Processing page ${pageNum}/${pagesToProcess}`);
        
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        // Create canvas for this page
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        
        // Render the page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Convert canvas to buffer
        const dataUrl = format === 'png' 
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', quality);
        
        // Convert data URL to buffer
        const base64Data = dataUrl.split(',')[1];
        const binaryString = atob(base64Data);
        const imageBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBuffer[i] = binaryString.charCodeAt(i);
        }
        
        images.push({
          pageNumber: pageNum,
          imageData: imageBuffer,
          width: viewport.width,
          height: viewport.height,
          format
        });
        
        console.log(`✅ Page ${pageNum} converted to ${format.toUpperCase()}`);
      }
      
      console.log(`🎉 PDF conversion complete: ${images.length} pages converted`);
      return images;
      
    } catch (error) {
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.name === 'PasswordException' || error.message.includes('password')) {
          // Don't log password errors as errors since they're expected and handled by the caller
          console.log('🔐 PDF password required (handled by caller)');
          throw new Error(`PDF is encrypted and requires a password: ${error.message}`);
        } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
          console.error('❌ Error converting PDF to images:', error);
          throw new Error(`PDF appears to be corrupted or invalid: ${error.message}`);
        } else {
          console.error('❌ Error converting PDF to images:', error);
          throw new Error(`Failed to convert PDF to images: ${error.message}`);
        }
      } else {
        console.error('❌ Error converting PDF to images:', error);
        throw new Error(`Failed to convert PDF to images: ${String(error)}`);
      }
    }
  }
  
  /**
   * Convert a single page of a PDF to an image
   */
  async convertPdfPageToImage(
    pdfBuffer: ArrayBuffer,
    pageNumber: number = 1,
    options: {
      scale?: number;
      format?: 'png' | 'jpeg';
      quality?: number;
      password?: string;
    } = {}
  ): Promise<PdfPageImage> {
    const {
      scale = 1.5,
      format = 'png',
      quality = 0.9,
      password
    } = options;

    try {
      console.log(`📄 Converting PDF page ${pageNumber} to image...`);
      
      // Ensure we have a valid ArrayBuffer and create a copy to prevent detachment issues
      if (!pdfBuffer) {
        throw new Error('Invalid PDF buffer: buffer is null or undefined');
      }
      
      if (pdfBuffer.byteLength === 0) {
        throw new Error('Invalid PDF buffer: buffer is empty');
      }
      
      // Check if the buffer is detached
      try {
        new Uint8Array(pdfBuffer);
      } catch (error) {
        throw new Error('Invalid PDF buffer: buffer is detached or corrupted');
      }
      
      // Create a copy of the buffer to prevent detachment issues
      const bufferCopy = pdfBuffer.slice(0);
      
      // Load the PDF document
      console.log(`🔐 Attempting to load PDF with password: ${password ? 'provided' : 'none'}`);
      const loadingTask = pdfjsLib.getDocument({ 
        data: bufferCopy,
        password: password
      });
      const pdf = await loadingTask.promise;
      
      if (pageNumber < 1 || pageNumber > pdf.numPages) {
        throw new Error(`Page number ${pageNumber} is out of range (1-${pdf.numPages})`);
      }
      
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      
      // Create canvas for this page
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      
      // Render the page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Convert canvas to buffer
      const dataUrl = format === 'png' 
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', quality);
      
      // Convert data URL to buffer
      const base64Data = dataUrl.split(',')[1];
      const binaryString = atob(base64Data);
      const imageBuffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        imageBuffer[i] = binaryString.charCodeAt(i);
      }
      
      console.log(`✅ Page ${pageNumber} converted successfully`);
      
      return {
        pageNumber,
        imageData: imageBuffer,
        width: viewport.width,
        height: viewport.height,
        format
      };
      
    } catch (error) {
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.name === 'PasswordException' || error.message.includes('password')) {
          // Don't log password errors as errors since they're expected and handled by the caller
          console.log(`🔐 PDF password required for page ${pageNumber} (handled by caller)`);
          throw new Error(`PDF is encrypted and requires a password: ${error.message}`);
        } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
          console.error(`❌ Error converting PDF page ${pageNumber} to image:`, error);
          throw new Error(`PDF appears to be corrupted or invalid: ${error.message}`);
        } else {
          console.error(`❌ Error converting PDF page ${pageNumber} to image:`, error);
          throw new Error(`Failed to convert PDF page ${pageNumber} to image: ${error.message}`);
        }
      } else {
        console.error(`❌ Error converting PDF page ${pageNumber} to image:`, error);
        throw new Error(`Failed to convert PDF page ${pageNumber} to image: ${String(error)}`);
      }
    }
  }
  
  /**
   * Check if a PDF is encrypted without requiring a password
   */
  async isPdfEncrypted(pdfBuffer: ArrayBuffer): Promise<boolean> {
    try {
      // Ensure we have a valid ArrayBuffer and create a copy to prevent detachment issues
      if (!pdfBuffer) {
        throw new Error('Invalid PDF buffer: buffer is null or undefined');
      }
      
      if (pdfBuffer.byteLength === 0) {
        throw new Error('Invalid PDF buffer: buffer is empty');
      }
      
      // Check if the buffer is detached
      try {
        new Uint8Array(pdfBuffer);
      } catch (error) {
        throw new Error('Invalid PDF buffer: buffer is detached or corrupted');
      }
      
      // Create a copy of the buffer to prevent detachment issues
      const bufferCopy = pdfBuffer.slice(0);
      
      // Try to load the PDF without a password
      console.log('🔐 Checking if PDF is encrypted...');
      const loadingTask = pdfjsLib.getDocument({ 
        data: bufferCopy
      });
      
      await loadingTask.promise;
      console.log('✅ PDF is not encrypted');
      return false;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'PasswordException' || error.message.includes('password')) {
          console.log('🔐 PDF is encrypted (detected during encryption check)');
          return true;
        }
      }
      // If it's not a password error, re-throw it
      throw error;
    }
  }

  /**
   * Get PDF metadata without converting to images
   */
  async getPdfMetadata(
    pdfBuffer: ArrayBuffer,
    password?: string
  ): Promise<{
    numPages: number;
    title?: string;
    author?: string;
    subject?: string;
    creationDate?: string;
  }> {
    try {
      // Ensure we have a valid ArrayBuffer and create a copy to prevent detachment issues
      if (!pdfBuffer) {
        throw new Error('Invalid PDF buffer: buffer is null or undefined');
      }
      
      if (pdfBuffer.byteLength === 0) {
        throw new Error('Invalid PDF buffer: buffer is empty');
      }
      
      // Check if the buffer is detached
      try {
        new Uint8Array(pdfBuffer);
      } catch (error) {
        throw new Error('Invalid PDF buffer: buffer is detached or corrupted');
      }
      
      // Create a copy of the buffer to prevent detachment issues
      const bufferCopy = pdfBuffer.slice(0);
      
      // Load the PDF document
      console.log(`🔐 Attempting to load PDF metadata with password: ${password ? 'provided' : 'none'}`);
      const loadingTask = pdfjsLib.getDocument({ 
        data: bufferCopy,
        password: password
      });
      const pdf = await loadingTask.promise;
      
      const metadata = await pdf.getMetadata();
      
      return {
        numPages: pdf.numPages,
        title: metadata?.info?.Title,
        author: metadata?.info?.Author,
        subject: metadata?.info?.Subject,
        creationDate: metadata?.info?.CreationDate
      };
    } catch (error) {
      console.error('❌ Error getting PDF metadata:', error);
      throw new Error(`Failed to get PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const pdfToImageService = new PdfToImageService(); 