import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UniversityDetail from './UniversityDetail';
import { catalogApi } from '../../lib/catalogApi';
import type { CatalogUniversity } from '../../types/university';

jest.mock('../../lib/catalogApi', () => ({
  catalogApi: { getUniversityBySlug: jest.fn() },
}));

const mockedGet = catalogApi.getUniversityBySlug as jest.MockedFunction<typeof catalogApi.getUniversityBySlug>;

const fullUniversity: CatalogUniversity = {
  _id: 'u1',
  name: 'Example University',
  shortName: 'EXU',
  slug: 'example-university',
  countryId: { _id: 'c1', name: 'Japan', code: 'JP', flag: 'JP' },
  website: 'https://example.edu',
  seatLimit: 20,
  city: 'Tokyo',
  tagline: 'Study in the heart of the city.',
  about: ['A large research university.'],
  facts: [{ label: 'Founded', value: '1900' }],
  highlights: ['Strong industry links'],
  programmes: [
    { name: 'BSc Computer Science', level: 'Bachelor', duration: '4 years', language: 'English', credits: '130', description: 'Core CS.' },
  ],
  intakes: [
    // No milestones stored: the page generates the standard timeline from the start date.
    { id: 'fall-2099', label: 'Fall 2099', season: 'Fall', startDate: '2099-09-01', applicationDeadline: '2099-05-01', seatsTotal: 10, seatsTaken: 3, milestones: [] },
    { id: 'spring-2100', label: 'Spring 2100', season: 'Spring', startDate: '2100-02-01', applicationDeadline: '2099-10-01', seatsTotal: 10, seatsTaken: 0, milestones: [] },
  ],
  costs: [{ label: 'Housing', amount: 'USD 300', note: 'Per month' }],
  requirements: ['CGPA above 3.0'],
  visa: { title: 'Student visa', summary: 'Apply at the embassy.', steps: ['Get the offer letter'] },
  faqs: [{ question: 'Do I need Japanese?', answer: 'No, courses are in English.' }],
  contact: { email: 'exchange@example.edu', phone: '', address: '', website: 'https://example.edu' },
};

const sparseUniversity: CatalogUniversity = {
  _id: 'u2',
  name: 'Sparse University',
  shortName: 'SPU',
  slug: 'sparse-university',
  countryId: { _id: 'c1', name: 'Japan', code: 'JP' },
  seatLimit: 5,
};

const renderPage = (slug: string) =>
  render(
    <MemoryRouter initialEntries={[`/dashboard/programmes/${slug}`]}>
      <Routes>
        <Route path="/dashboard/programmes/:slug" element={<UniversityDetail />} />
        <Route path="/dashboard/programmes" element={<div>programmes list</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  mockedGet.mockReset();
});

describe('UniversityDetail', () => {
  it('loads the university by slug and renders it, with a generated timeline', async () => {
    mockedGet.mockResolvedValue(fullUniversity);
    renderPage('example-university');

    expect(await screen.findByRole('heading', { level: 1, name: 'Example University' })).toBeTruthy();
    expect(mockedGet).toHaveBeenCalledWith('example-university');
    expect(screen.getByText('Intake timeline')).toBeTruthy();
    expect(screen.getAllByText('Applications open').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Start application').length).toBeGreaterThan(0);
    expect(screen.queryByText(/student rating/i)).toBeNull();
  });

  it('switches the timeline when another intake is chosen', async () => {
    mockedGet.mockResolvedValue(fullUniversity);
    renderPage('example-university');

    fireEvent.click(await screen.findByRole('button', { name: /Spring 2100/ }));

    expect(screen.getAllByText(/Classes begin/).length).toBeGreaterThan(0);
  });

  it('opens a FAQ answer when its question is clicked', async () => {
    mockedGet.mockResolvedValue(fullUniversity);
    renderPage('example-university');
    const faq = fullUniversity.faqs![0];

    await screen.findByRole('heading', { level: 1, name: 'Example University' });
    expect(screen.queryByText(faq.answer)).toBeNull();
    fireEvent.click(screen.getByText(faq.question));
    expect(screen.getByText(faq.answer)).toBeTruthy();
  });

  it('hides sections an admin left empty instead of showing blank cards', async () => {
    mockedGet.mockResolvedValue(sparseUniversity);
    renderPage('sparse-university');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sparse University' })).toBeTruthy();
    expect(screen.queryByText('Intake timeline')).toBeNull();
    expect(screen.queryByText('Frequently asked questions')).toBeNull();
    expect(screen.queryByText('Budget and funding')).toBeNull();
    expect(screen.queryByText('Programmes open to exchange students')).toBeNull();
  });

  it('sends unknown or unpublished universities back to the list', async () => {
    mockedGet.mockRejectedValue(new Error('not found'));
    renderPage('not-a-university');
    expect(await screen.findByText('programmes list')).toBeTruthy();
  });
});
