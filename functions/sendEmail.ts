Deno.serve(async (_req) => {
  return Response.json(
    {
      error: 'Email delivery is not configured yet.',
      code: 'not_implemented',
      provider: 'brevo',
      required_secrets: ['BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'BREVO_SENDER_NAME'],
      expected_request_shape: {
        to: 'user@example.com',
        subject: 'Welcome',
        html: '<p>Hello</p>',
        text: 'Hello',
      },
      expected_response_shape: {
        success: true,
        message_id: 'provider-message-id',
      },
    },
    { status: 501 },
  );
});
