jest.mock('../../utils/jwt', () => ({
  verifyToken: jest.fn(),
  verifyMediaToken: jest.fn(),
}));

const { verifyToken, verifyMediaToken } = require('../../utils/jwt');
const { authenticateForMedia } = require('../auth');

function fakeRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authenticateForMedia (Phase F — live camera stream route only)', () => {
  it('accepts a real Authorization header via the same verifyToken() as the normal authenticate() middleware', () => {
    verifyToken.mockReturnValue({ userId: 1, role: 'CUSTOMER' });
    const req = { headers: { authorization: 'Bearer real-token' }, query: {}, params: { id: '2' } };
    const next = jest.fn();

    authenticateForMedia(req, fakeRes(), next);

    expect(verifyToken).toHaveBeenCalledWith('real-token');
    expect(verifyMediaToken).not.toHaveBeenCalled();
    expect(req.user).toEqual({ userId: 1, role: 'CUSTOMER' });
    expect(next).toHaveBeenCalled();
  });

  it('falls back to a ?token= query parameter, verified as a scoped media token (never the primary verifyToken)', () => {
    verifyMediaToken.mockReturnValue({ purpose: 'live-camera-media', providerId: 2 });
    const req = { headers: {}, query: { token: 'media-token' }, params: { id: '2' } };
    const next = jest.fn();

    authenticateForMedia(req, fakeRes(), next);

    expect(verifyMediaToken).toHaveBeenCalledWith('media-token', '2');
    expect(verifyToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('prefers a real Authorization header over a query token when both are present', () => {
    verifyToken.mockReturnValue({ userId: 1, role: 'CUSTOMER' });
    const req = {
      headers: { authorization: 'Bearer header-token' },
      query: { token: 'media-token' },
      params: { id: '2' },
    };

    authenticateForMedia(req, fakeRes(), jest.fn());

    expect(verifyToken).toHaveBeenCalledWith('header-token');
    expect(verifyMediaToken).not.toHaveBeenCalled();
  });

  it('rejects a query token that fails scope verification (e.g. minted for a different provider)', () => {
    verifyMediaToken.mockImplementation(() => {
      throw new Error('Invalid media token');
    });
    const req = { headers: {}, query: { token: 'media-token-for-provider-3' }, params: { id: '2' } };
    const res = fakeRes();
    const next = jest.fn();

    authenticateForMedia(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 401 when neither a header nor a query token is present', () => {
    const req = { headers: {}, query: {}, params: { id: '2' } };
    const res = fakeRes();
    const next = jest.fn();

    authenticateForMedia(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(verifyToken).not.toHaveBeenCalled();
    expect(verifyMediaToken).not.toHaveBeenCalled();
  });

  it('rejects with 401 when the header token is invalid or expired', () => {
    verifyToken.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const req = { headers: { authorization: 'Bearer expired' }, query: {}, params: { id: '2' } };
    const res = fakeRes();
    const next = jest.fn();

    authenticateForMedia(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 401 when the query media token is invalid or expired', () => {
    verifyMediaToken.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const req = { headers: {}, query: { token: 'expired-token' }, params: { id: '2' } };
    const res = fakeRes();
    const next = jest.fn();

    authenticateForMedia(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('never leaks the token value itself back in the error response', () => {
    verifyMediaToken.mockImplementation(() => {
      throw new Error('jwt malformed');
    });
    const req = { headers: {}, query: { token: 'super-secret-value' }, params: { id: '2' } };
    const res = fakeRes();

    authenticateForMedia(req, res, jest.fn());

    expect(JSON.stringify(res.json.mock.calls)).not.toContain('super-secret-value');
  });
});
