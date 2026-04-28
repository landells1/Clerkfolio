-- Keep curated templates useful without overwhelming new users.
delete from templates
where is_curated = true
  and name not in (
    'Completed Audit Cycle',
    'Prospective QIP',
    'Taught Medical Student Bedside Session',
    'National Conference Attendee',
    'Published Case Report',
    'Foundation Doctor Representative',
    'Medical School Prize',
    'Free Reflection',
    'Generic Achievement'
  );

