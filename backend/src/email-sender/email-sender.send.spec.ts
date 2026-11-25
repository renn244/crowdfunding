import { EmailSenderService } from './email-sender.service';

describe('EmailSenderService.sendEmail (Resend)', () => {
    const fetchMock = jest.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        global.fetch = fetchMock as any;
        process.env.RESEND_API_KEY = 're_test';
        process.env.EMAIL_FROM = 'noreply@example.com';
    });

    it('posts the email to Resend with the api key', async () => {
        fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 'abc' }) });

        await expect(new EmailSenderService().sendEmail('juan@example.com', 'Donation', 'Thank you', 'Thanks!')).resolves.toEqual({ id: 'abc' });

        const [url, init] = fetchMock.mock.calls[0];
        const body = JSON.parse(init.body);
        expect(url).toBe('https://api.resend.com/emails');
        expect(init.headers.Authorization).toBe('Bearer re_test');
        expect(body.from).toBe('CrowdFund <noreply@example.com>');
        expect(body.to).toEqual(['juan@example.com']);
        expect(body.subject).toBe('Donation');
        expect(body.html).toContain('Thank you');
    });

    it('throws when Resend rejects the email', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'API key is invalid' });

        await expect(new EmailSenderService().sendEmail('juan@example.com', 'Donation', 'Thank you', 'Thanks!')).rejects.toThrow('Error sending email');
    });

    it('throws without calling Resend when the key is missing', async () => {
        delete process.env.RESEND_API_KEY;

        await expect(new EmailSenderService().sendEmail('juan@example.com', 'Donation', 'Thank you', 'Thanks!')).rejects.toThrow('RESEND_API_KEY');
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
