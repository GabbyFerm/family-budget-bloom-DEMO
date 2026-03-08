import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMonthYear, getAdjacentMonth } from '@/lib/format';

interface MonthPickerProps {
  monthYear: string;
  onChange: (monthYear: string) => void;
}

const MonthPicker = ({ monthYear, onChange }: MonthPickerProps) => {
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <Button variant="ghost" size="icon" onClick={() => onChange(getAdjacentMonth(monthYear, -1))}>
        <ChevronLeft size={20} strokeWidth={1.5} />
      </Button>
      <h2 className="text-xl font-semibold min-w-[180px] text-center">
        {formatMonthYear(monthYear)}
      </h2>
      <Button variant="ghost" size="icon" onClick={() => onChange(getAdjacentMonth(monthYear, 1))}>
        <ChevronRight size={20} strokeWidth={1.5} />
      </Button>
    </div>
  );
};

export default MonthPicker;
