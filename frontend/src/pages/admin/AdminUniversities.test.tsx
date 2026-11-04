import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminUniversities from './AdminUniversities';
import { adminApi, type UniversityRecord } from '../../lib/adminApi';

jest.mock('../../lib/adminApi', () => ({
  adminApi: {
    getUniversities: jest.fn(),
    getUsers: jest.fn(),
    createUniversity: jest.fn(),
    updateUniversity: jest.fn(),
    scrapeUniversity: jest.fn(),
  },
}));

const api = adminApi as jest.Mocked<typeof adminApi>;

const korea = { _id: 'c-kr', name: 'South Korea', code: 'KR', flag: 'KR' };
const published = {
  _id: 'u1',
  name: 'Kyungdong University',
  shortName: 'KDU',
  slug: 'kdu',
  countryId: korea,
  website: 'https://kdu.example',
  seatLimit: 100,
  status: 'published',
  city: 'Goseong',
  advisorIds: ['a1'],
  hostCourseCount: 8,
  publishIssues: [],
  intakes: [{ id: 'f', label: 'Fall 2027', season: 'Fall', startDate: '2027-09-01', applicationDeadline: '2027-05-01', seatsTotal: 30, seatsTaken: 1, milestones: [] }],
  programmes: [{ name: 'BSc Smart Computing', level: 'Bachelor', duration: '4y', language: 'English', credits: '130', description: '' }],
  contact: { email: 'x@kdu.example' },
} as unknown as UniversityRecord;

const draft = {
  _id: 'u2',
  name: 'Istanbul Aydin University',
  shortName: 'IAU',
  countryId: { _id: 'c-tr', name: 'Turkey', code: 'TR' },
  seatLimit: 100,
  status: 'draft',
  advisorIds: [],
  hostCourseCount: 0,
  publishIssues: ['City', 'Website'],
} as unknown as UniversityRecord;

const advisors = [
  { _id: 'a1', name: 'Kasia Advisor', email: 'kasia@x.com', role: 'advisor' },
  { _id: 'a2', name: 'Bilal Advisor', email: 'bilal@x.com', role: 'advisor' },
  { _id: 'a3', name: 'Gone Advisor', email: 'gone@x.com', role: 'advisor', offboardedAt: '2026-01-01' },
  { _id: 'adm', name: 'The Admin', email: 'admin@x.com', role: 'admin' },
];

beforeEach(() => {
  jest.resetAllMocks();
  api.getUniversities.mockResolvedValue([published, draft]);
  api.getUsers.mockResolvedValue(advisors as never);
});

const renderPage = async () => {
  render(<AdminUniversities />);
  await screen.findByText('Kyungdong University');
};

describe('AdminUniversities', () => {
  it('lists universities with their status, advisors and what is left to finish', async () => {
    await renderPage();

    expect(screen.getByText('Published')).toBeTruthy();
    expect(screen.getByText('Draft')).toBeTruthy();
    expect(screen.getByText('2 to finish')).toBeTruthy();
    expect(screen.getByText('Kasia Advisor')).toBeTruthy();
    expect(screen.getByText('None')).toBeTruthy();
  });

  it('blocks publishing a new university until its requirements are met', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add University/ }));

    const dialog = await screen.findByRole('dialog');
    expect((within(dialog).getByRole('button', { name: 'Publish' }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(dialog).getByText(/Before this can be published/)).toBeTruthy();
    expect(within(dialog).getByText(/At least one host course/)).toBeTruthy();
  });

  it('only offers active advisors', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add University/ }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Kasia Advisor')).toBeTruthy();
    expect(within(dialog).getByText('Bilal Advisor')).toBeTruthy();
    expect(within(dialog).queryByText('Gone Advisor')).toBeNull();
    expect(within(dialog).queryByText('The Admin')).toBeNull();
  });

  it('searches the world country list and saves a draft with the chosen country and advisors', async () => {
    api.createUniversity.mockResolvedValue({ university: { name: 'Tokyo Example' }, assignedApplications: 2 } as never);
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add University/ }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText('Search countries'), { target: { value: 'japan' } });
    fireEvent.click(await within(dialog).findByRole('button', { name: /Japan/ }));
    fireEvent.change(within(dialog).getByPlaceholderText('e.g. Multimedia University'), { target: { value: 'Tokyo Example' } });
    fireEvent.change(within(dialog).getByPlaceholderText('e.g. MMU'), { target: { value: 'tku' } });
    fireEvent.click(within(dialog).getByLabelText(/Bilal Advisor/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save as draft' }));

    await waitFor(() => expect(api.createUniversity).toHaveBeenCalledTimes(1));
    const payload = api.createUniversity.mock.calls[0][0];
    expect(payload.country).toMatchObject({ name: 'Japan', code: 'JP' });
    expect(payload.shortName).toBe('TKU');
    expect(payload.advisorIds).toEqual(['a2']);
    expect(payload.status).toBe('draft');
    expect(await screen.findByText(/2 waiting applications were assigned/)).toBeTruthy();
  });

  it('shows the server error and keeps the form open when saving fails', async () => {
    api.createUniversity.mockRejectedValue({ message: 'University already exists.', reason: 'Another university has the same name.' });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add University/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save as draft' }));

    expect(await within(dialog).findByText(/University already exists\. Another university has the same name\./)).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('opens an existing university with its country fixed and its advisors selected', async () => {
    await renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: /Edit/ })[0]);
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText('Fixed once a university exists')).toBeTruthy();
    expect((within(dialog).getByLabelText(/Kasia Advisor/) as HTMLInputElement).checked).toBe(true);
    expect((within(dialog).getByLabelText(/Bilal Advisor/) as HTMLInputElement).checked).toBe(false);
    expect((within(dialog).getByRole('button', { name: 'Publish' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('fills only empty fields from a website scan and marks sections for review', async () => {
    api.scrapeUniversity.mockResolvedValue({
      fields: { name: 'Scanned Name', city: 'Springfield', website: 'https://scan.example', about: ['Scanned about.'], contact: { email: 'hi@scan.example' } },
      confidence: { name: 'found', city: 'review', about: 'review' },
      sources: ['https://scan.example/'],
      warnings: ['Skipped /private because robots.txt asks crawlers not to read it.'],
    });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Add University/ }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByPlaceholderText('e.g. Multimedia University'), { target: { value: 'My Typed Name' } });
    fireEvent.change(within(dialog).getByLabelText('University website to scan'), { target: { value: 'https://scan.example' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Auto-fill from website/ }));

    expect(await within(dialog).findByText(/Read 1 page/)).toBeTruthy();
    expect((within(dialog).getByPlaceholderText('e.g. Multimedia University') as HTMLInputElement).value).toBe('My Typed Name');
    expect((within(dialog).getByDisplayValue('Springfield') as HTMLInputElement).value).toBe('Springfield');
    expect(within(dialog).getByDisplayValue('hi@scan.example')).toBeTruthy();
    expect(within(dialog).getByText(/Skipped \/private/)).toBeTruthy();
    expect(within(dialog).getAllByText('Review before saving').length).toBeGreaterThan(0);
  });
});
