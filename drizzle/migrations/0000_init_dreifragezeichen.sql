CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  display_name text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles own update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles own insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.episodes (
  number int PRIMARY KEY,
  title text NOT NULL,
  release_date date,
  description text,
  author text,
  duration_minutes int,
  cover_path text
);
GRANT SELECT ON public.episodes TO anon, authenticated;
GRANT ALL ON public.episodes TO service_role;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "episodes public read" ON public.episodes FOR SELECT USING (true);

CREATE TABLE public.logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  episode_number int NOT NULL REFERENCES public.episodes(number) ON DELETE CASCADE,
  listened_on date NOT NULL DEFAULT current_date,
  rating numeric(2,1) CHECK (rating IS NULL OR (rating >= 0.5 AND rating <= 5 AND rating * 2 = floor(rating * 2))),
  liked boolean NOT NULL DEFAULT false,
  review text,
  is_relisten boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX logs_episode_idx ON public.logs(episode_number);
CREATE INDEX logs_user_idx ON public.logs(user_id, listened_on DESC);
GRANT SELECT ON public.logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logs TO authenticated;
GRANT ALL ON public.logs TO service_role;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs public read" ON public.logs FOR SELECT USING (true);
CREATE POLICY "logs own insert" ON public.logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "logs own update" ON public.logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "logs own delete" ON public.logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.watchlist (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  episode_number int NOT NULL REFERENCES public.episodes(number) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, episode_number)
);
GRANT SELECT ON public.watchlist TO anon;
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchlist public read" ON public.watchlist FOR SELECT USING (true);
CREATE POLICY "watchlist own insert" ON public.watchlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlist own delete" ON public.watchlist FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 4),
  episode_number int NOT NULL REFERENCES public.episodes(number) ON DELETE CASCADE,
  PRIMARY KEY (user_id, position),
  UNIQUE (user_id, episode_number)
);
GRANT SELECT ON public.favorites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites public read" ON public.favorites FOR SELECT USING (true);
CREATE POLICY "favorites own insert" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites own update" ON public.favorites FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites own delete" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows public read" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows own insert" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows own delete" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base text; candidate text; n int := 0;
BEGIN
  base := lower(regexp_replace(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'detektiv'), '[^a-zA-Z0-9_]', '', 'g'));
  IF base = '' THEN base := 'detektiv'; END IF;
  base := left(base, 20);
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    n := n + 1; candidate := base || n::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, candidate, coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', candidate));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE VIEW public.episode_stats WITH (security_invoker = true) AS
SELECT e.number,
  count(l.id)::int AS log_count,
  count(l.id) FILTER (WHERE l.liked)::int AS like_count,
  round(avg(l.rating), 2)::float AS avg_rating,
  count(l.rating)::int AS rating_count
FROM public.episodes e LEFT JOIN public.logs l ON l.episode_number = e.number
GROUP BY e.number;
GRANT SELECT ON public.episode_stats TO anon, authenticated;

INSERT INTO public.episodes (number,title,release_date,description,author,duration_minutes,cover_path) VALUES
(1,'und der Super-Papagei','1979-10-12','Der Auftrag an die drei Detektive hört sich recht harmlos an: Sie sollen einen entflogenen Papagei suchen.','Robert Arthur',52,'Music41/v4/c9/3f/e4/c93fe4aa-c385-ed18-2cb3-e4eeff284f5a'),
(2,'und der Phantomsee','1979-10-13','Welches Geheimnis verbirgt sich in einem vergilbten Brief und in den nach langer Zeit wieder aufgetauchten Aufzeichnungen des Seemanns Angus Gunn?','William Arden',45,'Music62/v4/87/1c/7f/871c7f1c-fdf1-bed9-bf1b-eb7ab73ec448'),
(3,'und der Karpatenhund','1979-10-14','"Bei mir spukt es!" Mit diesem verzweifelten Ausruf von Mr. Prentice beginnt ein neues Abenteuer für die drei ???.','M. V. Carey',45,'Music71/v4/a7/d8/54/a7d85469-a416-93a3-93ba-d8e82be2f8ae'),
(4,'und die schwarze Katze','1979-10-15','In einem kleinen Wanderzirkus wittern die drei jungen Detektive Justus, Peter und Bob ihren neuesten Fall.','William Arden',44,'Music71/v4/21/ee/57/21ee57b0-0949-8674-8b3d-c2c512c5fbc8'),
(5,'und der Fluch des Rubins','1979-10-16','Die drei ??? haben es mit einem seltsamen Vermächtnis zu tun: Onkel Horatio hat seinem Neffen etwas Wertvolles hinterlassen – aber was? Und vor allem wo?','Robert Arthur',49,'Music62/v4/f5/4e/46/f54e4607-2ea1-d765-632e-8a1723d4ba61'),
(6,'und der sprechende Totenkopf','1979-10-17','Peter und Bob halten von Anfang an nicht viel davon, dass ihr Freund Justus auf einer Versteigerung einen uralten Koffer mit unbekanntem Inhalt ersteigern will.','Robert Arthur',45,'Music71/v4/a7/e7/cb/a7e7cbc3-0ce0-34db-a310-d7b82546f2b0'),
(7,'und der unheimliche Drache','1979-10-31','Ein paar entlaufene Hunde zu suchen – naja, das ist normalerweise kein besonders verlockender Auftrag für drei clevere Detektive.','Nick West',45,'Music62/v4/c0/7a/ba/c07aba56-7363-71d6-72ba-38d2a968e379'),
(8,'und der grüne Geist','1979-11-01','Merkwürdig, dass an diesem Abend anscheinend nicht nur Peter und Bob zufällig das Haus des längst verstorbenen Mathias Green besichtigen, das abgerissen werden soll.','Robert Arthur',53,'Music22/v4/63/98/91/639891fc-8d20-3c32-78a9-5f12e7919932'),
(9,'und die rätselhaften Bilder','1979-11-02','Allzu viel ist es ja nicht, was der alte Maler Joshua Cameron hinterlassen hat – und obendrein blieb er die Miete schuldig!','William Arden',47,'Music41/v4/63/ed/85/63ed8571-c32d-cc88-3bf2-6b1921c9023b'),
(10,'und die flüsternde Mumie','1980-03-01','Die drei jungen Detektive Justus, Peter und Bob sind davon überzeugt: Eine tausendjährige Mumie kann nicht flüstern.','Robert Arthur',50,'Music62/v4/db/b7/97/dbb79799-f83a-4f0d-551f-5be2854150d9'),
(11,'und das Gespensterschloss','1980-03-02','Die drei ???, hinter denen sich die jungen Detektive Justus, Peter und Bob verbergen, helfen unwahrscheinliche Ereignisse zu klären.','Robert Arthur',48,'Music71/v4/cd/c3/65/cdc36537-ec11-9175-81ba-869e45908266'),
(12,'und der seltsame Wecker','1980-03-03','Es gibt Wecker, die klingeln, Wecker, die schnarren, Wecker, die Musik ertönen lassen oder einen mit Glöckchengeläut aus dem Schlaf holen.','Robert Arthur',45,'Music41/v4/79/3c/bb/793cbb57-e901-d11c-6d90-671e09e02f3b'),
(13,'und der lachende Schatten','1980-03-31','Schatten pflegen normalerweise zu schweigen. Hier aber lacht ein Schatten – schrill und furchterregend!','William Arden',44,'Music71/v4/35/d3/83/35d383d4-7cf8-4fc9-4a06-2197ae82f46b'),
(14,'und das Bergmonster','1980-04-01','Das neue Abenteuer, das Justus, Peter und Bob zu bestehen haben, fängt ganz harmlos an: mit der Suche nach einem Schlüssel.','M. V. Carey',42,'Music41/v4/05/0b/e1/050be1b1-f45d-df0a-eadd-3209014ed635'),
(15,'und der rasende Löwe','1980-04-02','Der sonst so sanfte Löwe George – die Attraktion in Jim Halls "Dschungelland" – ist in letzter Zeit so unruhig.','Nick West',39,'Music62/v4/9f/c3/e3/9fc3e3cc-6b71-2f31-ccda-8d0563427859'),
(16,'und der Zauberspiegel','1980-10-01','In einem riesigen, spanischen Spiegel, der Mrs. Darnley gehört, soll es spuken.','M. V. Carey',42,'Music22/v4/1d/6e/77/1d6e77a2-74de-ec6f-f1a7-00e72c4c5587'),
(17,'und die gefährliche Erbschaft','1980-10-02','Der geheimnisvolle Einsiedler Marcus Towne, genannt Dingo, hinterlässt ein mysteriöses Testament.','William Arden',42,'Music71/v4/c3/d1/54/c3d154da-ea87-eac1-9289-06338ff91f88'),
(18,'und die Geisterinsel','1980-10-03','Ein Flug quer über den amerikanischen Kontinent – das ist eine nicht zu verachtende Abwechslung für die drei jungen Detektive Justus, Peter und Bob.','Robert Arthur',43,'Music22/v4/c6/cb/bf/c6cbbf0e-39a0-59c0-1e63-897891edc918'),
(19,'und der Teufelsberg','1980-10-04','Auch wenn man nicht an Gespenster glaubt, bei einem abendlichen Spaziergang durchs Tal der Wehklagen können einem schon die Haare zu Berge stehen.','William Arden',44,'Music71/v4/d3/f9/6d/d3f96d65-f0ca-6f0d-df3f-99a4c4001ad1'),
(20,'und die flammende Spur','1980-10-09','Warum sind zwei undurchsichtige Fremde und ein weiterer Verdächtiger alle hinter dem Symbol eines zweiköpfigen Adlers her?','M. V. Carey',46,'Music71/v4/9c/22/48/9c22487b-4a6d-cdcd-73a1-9dedb817a74b'),
(21,'und der tanzende Teufel','1980-10-10','Eine Serie Diebstähle in Rocky Beach – und jedesmal fehlt einer jener verbreiteten schwarzen Bordkoffer.','William Arden',42,'Music62/v4/69/73/31/6973314b-daf9-0e89-4134-07b1f373be03'),
(22,'und der verschwundene Schatz','1981-05-13','Gerade als Justus, Peter und Bob eine Ausstellung japanischer Kunstschätze besuchen, wird dort ein besonders wertvoller juwelenbesetzter Gürtel gestohlen.','Robert Arthur',43,'Music71/v4/3b/78/bd/3b78bd6b-42d9-ce61-5d48-51cd97dc1481'),
(23,'und das Aztekenschwert','1981-05-14','Die Brüder Pico und Diego Alvaro verlieren durch ein Feuer ihren ganzen Besitz.','William Arden',42,'Music62/v4/77/07/ad/7707ad56-d0ce-2603-164d-1fab8c7f40ee'),
(24,'und die silberne Spinne','1981-05-15','Verschwörung in Magnusstad: Der junge Lars Holmqvist soll um sein Erbe gebracht werden.','Robert Arthur',42,'Music71/v4/4e/ad/fe/4eadfe23-76ab-6969-92c8-7b2be6860db6'),
(25,'und die singende Schlange','1981-10-19','Zugegeben, Mrs. Patricia Osborne ist eine etwas seltsame Dame.','M. V. Carey',46,'Music22/v4/ab/0f/a0/ab0fa07b-0c46-a978-cf16-bd81a917a253'),
(26,'und die Silbermine','1981-10-20','Allie Jamison kann die drei ??? schon manchmal aufregen, starrköpfig und voreingenommen, wie sie ist!','M. V. Carey',43,'Music71/v4/7a/bd/28/7abd289d-5bdf-7801-c118-0411b9e0a3a3'),
(27,'und der magische Kreis','1981-10-21','In Santa Monica geschehen an einem Abend gleich zwei folgenschwere Ereignisse: Ein Verlag geht in Flammen auf – und Filme werden gestohlen.','M. V. Carey',51,'Music22/v4/55/80/ff/5580ff01-dd66-4c6b-6789-04833fb6f7de'),
(28,'und der Doppelgänger','1981-10-22','Sollte es ihn wahrhaftig geben, einen zweiten … Justus Jonas?','William Arden',47,'Music62/v4/b9/3a/7f/b93a7f27-428b-6177-f0bf-adb70fe354e1'),
(30,'und das Riff der Haie','1982-06-20','Bobs Vater lädt die drei ??? ein, ihn zum "Riff der Haie" zu begleiten – und die Jungen geraten in turbulentes Geschehen zu Lande und zu Wasser.','William Arden',42,'Music122/v4/f5/55/e8/f555e807-513c-cbd8-92a7-9321d53a73ce'),
(31,'und das Narbengesicht','1983-03-11','Bob wundert sich über eine befremdliche Begegnung mit einem "Blinden" – oder ist er etwa ein "Blender", dieses Narbengesicht?','M. V. Carey',49,'Music60/v4/5c/21/69/5c21690c-22a5-0f5f-819b-f4fe055d2a66'),
(32,'und der Ameisenmensch','1983-03-12','Kribbelnde Spannung im wahrsten Sinne des Wortes verheißt dieser Fall – die drei ??? juckt das nicht.','M. V. Carey',44,'Music18/v4/ee/a7/6a/eea76a09-1b46-2ce4-d49d-c2beffb9c2ee'),
(33,'und die bedrohte Ranch','1983-10-21','Der Zufall vermittelt Justus, Peter und Bob die Bekanntschaft mit dem exzentrischen Ehepaar Barron.','M. V. Carey',44,'Music60/v4/75/a4/3e/75a43e24-3f85-84e8-4e12-7a676e917c1f'),
(34,'und der rote Pirat','1984-04-05','Wer verbirgt sich hinter der Maske des "roten Piraten" – und warum bedroht er Justus, Peter und Bob?','William Arden',44,'Music20/v4/10/44/3e/10443e9f-0980-d517-b1b9-e4056723e32b'),
(35,'und der Höhlenmensch','1984-10-16','Seit in Citrus Grove das vorgeschichtliche Skelett eines Menschen gefunden wurde, passieren seltsame Dinge …','M. V. Carey',54,'Music20/v4/74/96/05/749605ed-5b07-4f01-d58e-105a00f7e8ac'),
(36,'und der Super-Wal','1985-05-29','Ein gestrandeter Wal taucht im privaten Schwimmbecken eines gewissen Mr. auf.','Marc Brandel',48,'Music18/v4/3c/cd/bd/3ccdbd8b-6b79-5dd4-bf11-2ca8e42779cb'),
(37,'und der heimliche Hehler','1985-11-01','Das Verschwinden des fünfjährigen Teddy bringt einige Ungereimtheiten mit sich.','M. V. Carey',54,'Music18/v4/af/96/79/af967933-55d0-04c2-2c3d-9c7f7fb0ff8f'),
(38,'und der unsichtbare Gegner','1986-03-17','Die drei ??? nehmen "ihren" verrückten Großvater mit auf die Reise von Küste zu Küste.','M. V. Carey',42,'Music20/v4/8e/62/83/8e628357-93b4-dceb-5093-7d9451fa85f1'),
(39,'und die Perlenvögel','1986-03-18','Eigentlich haben die drei ??? ja Ferien – aber zum Ausruhen sollen sie nicht so schnell kommen.','Marc Brandel',47,'Music60/v4/be/a6/25/bea6258e-0108-4aee-9b8e-4ad4ca8aff3b'),
(40,'und der Automarder','1986-11-27','Zersplitterte Autofenster und eine gestohlene Goldmünze sind die einzigen Spuren eines Vandalen in Rocky Beach.','William Arden',47,'Music30/v4/e6/e1/67/e6e167a9-2ccb-ccde-ac21-12d7d3c59c72'),
(41,'und das Volk der Winde','1987-09-17','Der Wissenschaftler Arnold Brewster ruft die drei Detektive zu Hilfe, denn durch eine Intrige ist er in ein Altersheim abgeschoben worden.','Rose Estes',53,'Music30/v4/40/91/a1/4091a165-f3bf-d539-4991-0cc0f5e15d7d'),
(42,'und der weinende Sarg','1987-10-26','Die drei Detektive sind dem Geheimnis eines verborgenen Tresors auf der Spur.','Megan Stine',47,'Music60/v4/4f/0a/02/4f0a02ba-7b23-827f-a1ec-df7fd05eff8d'),
(43,'und der höllische Werwolf','1988-10-01','Ein Werwolf macht Hollywood unsicher – und dabei geht es ihm nur um kleine Teddybären.','M. V. Carey',50,'Music20/v4/60/e9/8c/60e98c78-820c-0d70-73e6-1be74c7a75e5'),
(44,'und der gestohlene Preis','1988-10-02','Die Vergangenheit holt Justus wieder ein. Er hat als Kind in dem Film "Die kleinen Strolche" mitgespielt.','Marc Brandel',50,'Music30/v4/ae/7e/db/ae7edb3e-2e14-1db9-0b66-0e4e974b9441'),
(45,'und das Gold der Wikinger','1989-04-01','Auf der Insel Ragnarson Rock geschehen geheimnisvolle Dinge! Fotos, die Bob gemacht hat, müssen der Schlüssel sein.','William Arden',47,'Music20/v4/18/8c/da/188cda31-fe30-44dc-67c3-4077061b2563'),
(46,'und der schrullige Millionär','1989-04-08','Als bei der Verlobung seiner Tochter ein Teller zu Boden fällt, erleidet der geizige Millionär Pilcher einen Herzanfall.','M. V. Carey',47,'Music18/v4/a3/0b/dc/a30bdc77-aec6-64c3-8c3a-690b915f0797'),
(47,'und der giftige Gockel','1989-11-24','"Millionen werden sterben!" flüstert das Unfallopfer. Ein Wettlauf mit der Zeit beginnt!','Megan & H. William Stine',47,'Music60/v4/b2/6a/0a/b26a0a70-39c9-b7f1-8598-728b054c373c'),
(48,'und die gefährlichen Fässer','1989-11-25','Die drei Detektive und Bobs Vater stürzen mit dem Flugzeug ab – mitten in ein Tal voller Geheimnisse und Gefahren.','G. H. Stone',47,'Music20/v4/6d/bc/09/6dbc093b-5548-962c-dab3-f37767f8546b'),
(49,'und die Comic-Diebe','1990-11-26','Auf der InterComiCon werden Comics von unersetzlichem Wert gestohlen, und die drei ??? stehen unmittelbar daneben.','William McCay',44,'Music60/v4/42/06/a6/4206a643-9994-b4a3-8bb1-05911a76dbed'),
(50,'und der verschwundene Filmstar','1991-03-19','Diller Rourke, Hauptdarsteller im Horrorstreifen "Atemberaubend II", erscheint nicht zu den Dreharbeiten auf dem Friedhof.','Megan & H. William Stine',57,'Music18/v4/3b/13/ce/3b13cee9-0f9c-66c0-c0b8-fff0d058bb66'),
(51,'und der riskante Ritt','1991-03-20','Caramba! Wie heiß brennt die Sonne in den Bergen der Sierra Madre!','Marc Brandel',54,'Music18/v4/1b/de/8a/1bde8a9a-6d18-6e8e-daca-86801874c325');