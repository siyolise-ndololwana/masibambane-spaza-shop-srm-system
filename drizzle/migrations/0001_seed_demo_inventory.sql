insert into public.suppliers (id, name, contact_person, phone, email, address) values
 ('11111111-1111-1111-1111-111111111101','Tasty Foods Ltd.','Nomsa Dube','0721234567','orders@tastyfoods.co.za','12 Main Rd, Soweto'),
 ('11111111-1111-1111-1111-111111111102','Clover SA','Peter Smit','0739876543','sales@clover.co.za','Industrial Park, Roodepoort'),
 ('11111111-1111-1111-1111-111111111103','Kasi Wholesale','Sipho Khumalo','0745551122','info@kasiwholesale.co.za','45 Market St, Tembisa');

insert into public.products (id, name, category, selling_price, cost_price, quantity, reorder_level, supplier_id, description) values
 ('22222222-2222-2222-2222-222222222201','Albany Sliced Bread','Bakery',18.50,14.00,2,10,'11111111-1111-1111-1111-111111111101','White sliced loaf 700g'),
 ('22222222-2222-2222-2222-222222222202','Full Cream Milk 1L','Dairy',22.00,17.50,5,15,'11111111-1111-1111-1111-111111111102','Long life full cream milk'),
 ('22222222-2222-2222-2222-222222222203','Iwisa Maize Meal 2kg','Staples',39.90,32.00,24,10,'11111111-1111-1111-1111-111111111103','Super maize meal'),
 ('22222222-2222-2222-2222-222222222204','Coca Cola 1.5L','Beverages',24.90,19.00,18,12,'11111111-1111-1111-1111-111111111103','Soft drink bottle'),
 ('22222222-2222-2222-2222-222222222205','Lucky Star Pilchards 400g','Canned',26.50,21.00,0,8,'11111111-1111-1111-1111-111111111103','Pilchards in tomato sauce'),
 ('22222222-2222-2222-2222-222222222206','Sunlight Dishwashing 750ml','Household',34.50,27.00,31,10,'11111111-1111-1111-1111-111111111103','Liquid dishwasher'),
 ('22222222-2222-2222-2222-222222222207','White Sugar 2.5kg','Staples',54.90,45.00,14,8,'11111111-1111-1111-1111-111111111103','Refined white sugar'),
 ('22222222-2222-2222-2222-222222222208','Sunflower Oil 2L','Staples',79.90,66.00,9,6,'11111111-1111-1111-1111-111111111103','Cooking oil');

insert into public.expenses (description, category, amount, expense_date) values
 ('Electricity prepaid','Utilities',450.00, current_date - 3),
 ('Shop rent','Rent',2500.00, current_date - 10),
 ('Transport for stock collection','Transport',320.00, current_date - 1);
