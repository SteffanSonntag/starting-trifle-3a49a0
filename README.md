# DataBloc Website

Static HTML site for DataBloc, hosted on Netlify.

## Contact Form Backend

The contact form on `contact.html` submits to a Netlify serverless function (`netlify/functions/send-contact.js`) which sends an email via Gmail SMTP using [nodemailer](https://nodemailer.com/).

### Required Environment Variables

Set these in your Netlify site's **Environment Variables** settings (Site settings → Environment variables):

| Variable | Description |
|---|---|
| `EMAIL_FROM` | The Gmail address used to send email (e.g. `you@gmail.com`) |
| `EMAIL_TO` | The address that receives contact form submissions |
| `EMAIL_PASSWORD` | A Google **App Password** for `EMAIL_FROM` (see below) |

> **Important:** `EMAIL_PASSWORD` must be a [Google App Password](https://support.google.com/accounts/answer/185833), **not** your regular Gmail password. You must have 2-Step Verification enabled on the Google account before you can create an App Password.

### Local Development

Install dependencies and run a local Netlify dev server:

```bash
npm install
npx netlify dev
```

The site and functions will be available at `http://localhost:8888`. The contact form will submit to `http://localhost:8888/.netlify/functions/send-contact`.

Create a `.env` file (never commit this) with your local credentials:

```
EMAIL_FROM=you@gmail.com
EMAIL_TO=recipient@example.com
EMAIL_PASSWORD=your-app-password
```
