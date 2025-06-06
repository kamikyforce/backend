jest.mock('../src/config/redis', () => ({
  keys: jest.fn().mockResolvedValue([]),
  del: jest.fn().mockResolvedValue(1)
}));