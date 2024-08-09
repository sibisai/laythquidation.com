import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class QRCodeService {
  private apiUrl: string = 'https://api.qrserver.com/v1/create-qr-code/';

  constructor() { }

  generateQRCodeURL(data: string, size: string = '300x300', ecc: string = 'L', color: string = '0-0-0', bgcolor: string = '255-255-255'): string {
    const params = new URLSearchParams({
      data: encodeURIComponent(data),
      size: size,
      ecc: ecc,
      color: color,
      bgcolor: bgcolor
    });

    return `${this.apiUrl}?${params.toString()}`;
  }
}