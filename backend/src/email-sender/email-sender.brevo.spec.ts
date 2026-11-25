import { EmailSenderService } from './email-sender.service';

describe('EmailSenderService.sendEmail (Brevo)', () => {
    const fetchMock = jest.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        global.fetch = fetchMock as any;
        process.env.BREVO_API_KEY = 'xkeysib-test';
    });

    it('posts the email to Brevo with the api key', async () => {
        fetchMock.mockResolvedValue({ ok: true, json: async () => ({ messageId: 'abc' }) });

        await expect(new EmailSenderService().sendEmail('juan@example.com', 'Donation', 'Thank you', 'Thanks!')).resolves.toEqual({ messageId: 'abc' });

        const [url, init] = fetchMock.mock.calls[0];
        const body = JSON.parse(init.body);
        expect(url).toBe('https://api.brevo.com/v3/smtp/email');
        expect(init.headers['api-key']).toBe('xkeysib-test');
        expect(body.to).toEqual([{ email: 'juan@example.com' }]);
        expect(body.subject).toBe('Donation');
        expect(body.htmlContent).toContain('Thank you');
    });

    it('throws when Brevo rejects the email', async () => {
        fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'Key not found' });

        await expect(new EmailSenderService().sendEmail('juan@example.com', 'Donation', 'Thank you', 'Thanks!')).rejects.toThrow('Error sending email');
    });

    it('throws without calling Brevo when the key is missing', async () => {
        delete process.env.BREVO_API_KEY;

        await expect(new EmailSenderService().sendEmail('juan@example.com', 'Donation', 'Thank you', 'Thanks!')).rejects.toThrow('BREVO_API_KEY');
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
