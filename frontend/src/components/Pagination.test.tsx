import { fireEvent, render, screen } from '@testing-library/react';
import Pagination, { getPageWindow } from './Pagination';

describe('getPageWindow', () => {
  it('lists every page when there are few', () => {
    expect(getPageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses distant pages into gaps', () => {
    expect(getPageWindow(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
    expect(getPageWindow(1, 20)).toEqual([1, 2, null, 20]);
  });
});

describe('Pagination', () => {
  it('renders nothing when the list fits on one page', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} total={8} pageSize={10} onPageChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the range and changes page', () => {
    const onPageChange = jest.fn();
    render(<Pagination page={2} totalPages={3} total={25} pageSize={10} onPageChange={onPageChange} />);
    expect(screen.getByText('Showing 11–20 of 25')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('disables previous on the first page', () => {
    render(<Pagination page={1} totalPages={3} total={25} pageSize={10} onPageChange={() => {}} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });
});
