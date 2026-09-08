/**
 * Service untuk integrasi WhatsApp HTTP API (WAHA)
 * Mengirim notifikasi WhatsApp otomatis ke anggota tim
 */

export const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    // Hapus semua karakter selain angka
    let cleaned = phone.toString().replace(/\D/g, '');
    
    // Normalisasi awalan nomor Indonesia
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.slice(1);
    } else if (cleaned.startsWith('8')) {
        cleaned = '62' + cleaned;
    }

    // Validasi panjang nomor minimal (misal: 628xxx -> min 10 digit)
    if (cleaned.length < 9) return null;

    return cleaned;
};

export const formatChatId = (phone) => {
    const cleaned = formatPhoneNumber(phone);
    if (!cleaned) return null;
    return `${cleaned}@c.us`;
};

const cleanUrl = (url) => {
    if (!url) return '';
    let trimmed = url.trim().replace(/\/+$/, '');
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        trimmed = 'https://' + trimmed;
    }
    return trimmed;
};

/**
 * Mengirim pesan WhatsApp via WAHA API
 */
export const sendWahaMessage = async ({ url, apiKey, session = 'default' }, phone, text) => {
    const chatId = formatChatId(phone);
    if (!chatId) {
        throw new Error('Nomor WhatsApp tujuan tidak valid');
    }

    const baseUrl = cleanUrl(url);
    if (!baseUrl) {
        throw new Error('URL WAHA belum dikonfigurasi');
    }

    const endpoint = `${baseUrl}/api/sendText`;
    const headers = {
        'Content-Type': 'application/json',
    };
    if (apiKey && apiKey.trim()) {
        headers['X-Api-Key'] = apiKey.trim();
    }

    const payload = {
        session: session || 'default',
        chatId: chatId,
        text: text
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let errorDetail = '';
        try {
            const errJson = await response.json();
            errorDetail = errJson.message || errJson.error || JSON.stringify(errJson);
        } catch {
            errorDetail = response.statusText;
        }
        throw new Error(`Gagal kirim WA (${response.status}): ${errorDetail}`);
    }

    return await response.json();
};

/**
 * Uji koneksi dan kirim pesan percobaan
 */
export const testWahaConnection = async (wahaConfig, testPhone) => {
    const testText = `🧪 *TES KONEKSI WAHA - BD Project Management*\n\n` +
        `Halo! Konfigurasi WhatsApp Gateway (WAHA) telah berhasil terhubung.\n` +
        `Waktu tes: ${new Date().toLocaleString('id-ID')}\n\n` +
        `_Sistem siap mengirimkan notifikasi tugas ke WhatsApp._`;

    return await sendWahaMessage(wahaConfig, testPhone, testText);
};

/**
 * Format dan dispatch notifikasi WhatsApp untuk event tugas
 */
export const dispatchWahaNotification = async (wahaConfig, recipientPhone, { title, message, taskTitle, projectName, senderName }) => {
    if (!wahaConfig || !wahaConfig.enabled || !wahaConfig.url) {
        return; // WAHA dinonaktifkan atau belum diset
    }

    if (!recipientPhone) {
        return; // User belum mengisi nomor WhatsApp
    }

    // Bangun template pesan yang rapi dengan emoji
    let text = `🔔 *BD PROJECT MANAGEMENT*\n\n`;
    text += `*${title.toUpperCase()}*\n`;
    text += `${message}\n\n`;

    if (taskTitle) {
        text += `📋 *Tugas:* ${taskTitle}\n`;
    }
    if (projectName) {
        text += `📁 *Project:* ${projectName}\n`;
    }
    if (senderName) {
        text += `👤 *Oleh:* ${senderName}\n`;
    }

    text += `\n_Buka aplikasi untuk melihat rincian tugas._`;

    try {
        await sendWahaMessage(wahaConfig, recipientPhone, text);
    } catch (err) {
        console.warn('[WAHA Dispatch Warning]:', err.message);
        // Jangan throw error agar tidak mengganggu aliran aplikasi frontend
    }
};
