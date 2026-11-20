export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          actie: string
          door: string | null
          id: string
          nieuw: Json | null
          op: string
          organisatie_id: string
          oud: Json | null
          record_id: string
          tabel: string
        }
        Insert: {
          actie: string
          door?: string | null
          id?: string
          nieuw?: Json | null
          op?: string
          organisatie_id: string
          oud?: Json | null
          record_id: string
          tabel: string
        }
        Update: {
          actie?: string
          door?: string | null
          id?: string
          nieuw?: Json | null
          op?: string
          organisatie_id?: string
          oud?: Json | null
          record_id?: string
          tabel?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      bracket: {
        Row: {
          fase_id: string
          id: string
          label_prefix: string | null
          naam: string
          organisatie_id: string
        }
        Insert: {
          fase_id: string
          id?: string
          label_prefix?: string | null
          naam: string
          organisatie_id: string
        }
        Update: {
          fase_id?: string
          id?: string
          label_prefix?: string | null
          naam?: string
          organisatie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bracket_fase_id_organisatie_id_fkey"
            columns: ["fase_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "fase"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "bracket_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      doorstroomregel: {
        Row: {
          id: string
          naar_bracket_id: string | null
          naar_poule_id: string | null
          organisatie_id: string
          positie_tot: number
          positie_van: number
          van_fase_id: string
        }
        Insert: {
          id?: string
          naar_bracket_id?: string | null
          naar_poule_id?: string | null
          organisatie_id: string
          positie_tot: number
          positie_van: number
          van_fase_id: string
        }
        Update: {
          id?: string
          naar_bracket_id?: string | null
          naar_poule_id?: string | null
          organisatie_id?: string
          positie_tot?: number
          positie_van?: number
          van_fase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doorstroomregel_naar_bracket_id_organisatie_id_fkey"
            columns: ["naar_bracket_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "bracket"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "doorstroomregel_naar_poule_id_organisatie_id_fkey"
            columns: ["naar_poule_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "poule"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "doorstroomregel_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doorstroomregel_van_fase_id_organisatie_id_fkey"
            columns: ["van_fase_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "fase"
            referencedColumns: ["id", "organisatie_id"]
          },
        ]
      }
      fase: {
        Row: {
          id: string
          onderdeel_id: string
          organisatie_id: string
          ranglijst: Database["public"]["Enums"]["fase_ranglijst"]
          regelset: Json
          type: Database["public"]["Enums"]["fase_type"]
          volgorde: number
        }
        Insert: {
          id?: string
          onderdeel_id: string
          organisatie_id: string
          ranglijst?: Database["public"]["Enums"]["fase_ranglijst"]
          regelset?: Json
          type: Database["public"]["Enums"]["fase_type"]
          volgorde?: number
        }
        Update: {
          id?: string
          onderdeel_id?: string
          organisatie_id?: string
          ranglijst?: Database["public"]["Enums"]["fase_ranglijst"]
          regelset?: Json
          type?: Database["public"]["Enums"]["fase_type"]
          volgorde?: number
        }
        Relationships: [
          {
            foreignKeyName: "fase_onderdeel_id_organisatie_id_fkey"
            columns: ["onderdeel_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "onderdeel"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "fase_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      historie_bekerwinnaar: {
        Row: {
          beker_naam: string
          finalist_team_naam: string | null
          id: string
          organisatie_id: string
          seizoen_naam: string
          uitslag: string | null
          winnaar_team_naam: string
        }
        Insert: {
          beker_naam: string
          finalist_team_naam?: string | null
          id?: string
          organisatie_id: string
          seizoen_naam: string
          uitslag?: string | null
          winnaar_team_naam: string
        }
        Update: {
          beker_naam?: string
          finalist_team_naam?: string | null
          id?: string
          organisatie_id?: string
          seizoen_naam?: string
          uitslag?: string | null
          winnaar_team_naam?: string
        }
        Relationships: [
          {
            foreignKeyName: "historie_bekerwinnaar_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      historie_eindstand: {
        Row: {
          doelpunten_tegen: number | null
          doelpunten_voor: number | null
          gelijk: number | null
          gespeeld: number | null
          gewonnen: number | null
          id: string
          onderdeel_naam: string
          organisatie_id: string
          positie: number
          punten: number | null
          seizoen_naam: string
          team_naam: string
          verloren: number | null
        }
        Insert: {
          doelpunten_tegen?: number | null
          doelpunten_voor?: number | null
          gelijk?: number | null
          gespeeld?: number | null
          gewonnen?: number | null
          id?: string
          onderdeel_naam: string
          organisatie_id: string
          positie: number
          punten?: number | null
          seizoen_naam: string
          team_naam: string
          verloren?: number | null
        }
        Update: {
          doelpunten_tegen?: number | null
          doelpunten_voor?: number | null
          gelijk?: number | null
          gespeeld?: number | null
          gewonnen?: number | null
          id?: string
          onderdeel_naam?: string
          organisatie_id?: string
          positie?: number
          punten?: number | null
          seizoen_naam?: string
          team_naam?: string
          verloren?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historie_eindstand_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      historie_topscorer: {
        Row: {
          doelpunten: number
          id: string
          onderdeel_naam: string | null
          organisatie_id: string
          seizoen_naam: string
          speler_naam: string
          team_naam: string | null
        }
        Insert: {
          doelpunten: number
          id?: string
          onderdeel_naam?: string | null
          organisatie_id: string
          seizoen_naam: string
          speler_naam: string
          team_naam?: string | null
        }
        Update: {
          doelpunten?: number
          id?: string
          onderdeel_naam?: string | null
          organisatie_id?: string
          seizoen_naam?: string
          speler_naam?: string
          team_naam?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historie_topscorer_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      inschrijving: {
        Row: {
          id: string
          organisatie_id: string
          poule_id: string
          team_id: string
        }
        Insert: {
          id?: string
          organisatie_id: string
          poule_id: string
          team_id: string
        }
        Update: {
          id?: string
          organisatie_id?: string
          poule_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inschrijving_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inschrijving_poule_id_organisatie_id_fkey"
            columns: ["poule_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "poule"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "inschrijving_team_id_organisatie_id_fkey"
            columns: ["team_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id", "organisatie_id"]
          },
        ]
      }
      locatie: {
        Row: {
          id: string
          naam: string
          organisatie_id: string
          plaats: string | null
        }
        Insert: {
          id?: string
          naam: string
          organisatie_id: string
          plaats?: string | null
        }
        Update: {
          id?: string
          naam?: string
          organisatie_id?: string
          plaats?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locatie_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      nieuws: {
        Row: {
          datum: string
          id: string
          inhoud: string
          organisatie_id: string
          titel: string
        }
        Insert: {
          datum?: string
          id?: string
          inhoud?: string
          organisatie_id: string
          titel: string
        }
        Update: {
          datum?: string
          id?: string
          inhoud?: string
          organisatie_id?: string
          titel?: string
        }
        Relationships: [
          {
            foreignKeyName: "nieuws_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      onderdeel: {
        Row: {
          id: string
          naam: string
          organisatie_id: string
          seizoen_id: string
          volgorde: number
          vorm: Database["public"]["Enums"]["onderdeel_vorm"]
        }
        Insert: {
          id?: string
          naam: string
          organisatie_id: string
          seizoen_id: string
          volgorde?: number
          vorm: Database["public"]["Enums"]["onderdeel_vorm"]
        }
        Update: {
          id?: string
          naam?: string
          organisatie_id?: string
          seizoen_id?: string
          volgorde?: number
          vorm?: Database["public"]["Enums"]["onderdeel_vorm"]
        }
        Relationships: [
          {
            foreignKeyName: "onderdeel_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onderdeel_seizoen_id_organisatie_id_fkey"
            columns: ["seizoen_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "seizoen"
            referencedColumns: ["id", "organisatie_id"]
          },
        ]
      }
      organisatie: {
        Row: {
          aangemaakt_op: string
          id: string
          instellingen: Json
          kleur_primair: string | null
          kleur_secundair: string | null
          logo_url: string | null
          naam: string
          slug: string
          sportprofiel: string
        }
        Insert: {
          aangemaakt_op?: string
          id?: string
          instellingen?: Json
          kleur_primair?: string | null
          kleur_secundair?: string | null
          logo_url?: string | null
          naam: string
          slug: string
          sportprofiel?: string
        }
        Update: {
          aangemaakt_op?: string
          id?: string
          instellingen?: Json
          kleur_primair?: string | null
          kleur_secundair?: string | null
          logo_url?: string | null
          naam?: string
          slug?: string
          sportprofiel?: string
        }
        Relationships: []
      }
      organisatie_lid: {
        Row: {
          id: string
          organisatie_id: string
          rol: Database["public"]["Enums"]["lid_rol"]
          user_id: string
        }
        Insert: {
          id?: string
          organisatie_id: string
          rol: Database["public"]["Enums"]["lid_rol"]
          user_id: string
        }
        Update: {
          id?: string
          organisatie_id?: string
          rol?: Database["public"]["Enums"]["lid_rol"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organisatie_lid_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_beheerder: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      poule: {
        Row: {
          fase_id: string
          id: string
          naam: string
          organisatie_id: string
          volgorde: number
        }
        Insert: {
          fase_id: string
          id?: string
          naam: string
          organisatie_id: string
          volgorde?: number
        }
        Update: {
          fase_id?: string
          id?: string
          naam?: string
          organisatie_id?: string
          volgorde?: number
        }
        Relationships: [
          {
            foreignKeyName: "poule_fase_id_organisatie_id_fkey"
            columns: ["fase_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "fase"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "poule_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      punt_correctie: {
        Row: {
          aangemaakt_op: string
          id: string
          inschrijving_id: string
          organisatie_id: string
          punten: number
          reden: string
        }
        Insert: {
          aangemaakt_op?: string
          id?: string
          inschrijving_id: string
          organisatie_id: string
          punten: number
          reden: string
        }
        Update: {
          aangemaakt_op?: string
          id?: string
          inschrijving_id?: string
          organisatie_id?: string
          punten?: number
          reden?: string
        }
        Relationships: [
          {
            foreignKeyName: "punt_correctie_inschrijving_id_organisatie_id_fkey"
            columns: ["inschrijving_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "inschrijving"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "punt_correctie_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      schorsing: {
        Row: {
          aangemaakt_op: string
          id: string
          organisatie_id: string
          reden: string | null
          speler_id: string
          tot: string | null
          van: string | null
          wedstrijden: number | null
        }
        Insert: {
          aangemaakt_op?: string
          id?: string
          organisatie_id: string
          reden?: string | null
          speler_id: string
          tot?: string | null
          van?: string | null
          wedstrijden?: number | null
        }
        Update: {
          aangemaakt_op?: string
          id?: string
          organisatie_id?: string
          reden?: string | null
          speler_id?: string
          tot?: string | null
          van?: string | null
          wedstrijden?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "schorsing_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schorsing_speler_id_organisatie_id_fkey"
            columns: ["speler_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "speler"
            referencedColumns: ["id", "organisatie_id"]
          },
        ]
      }
      seizoen: {
        Row: {
          einddatum: string | null
          id: string
          naam: string
          organisatie_id: string
          startdatum: string | null
          status: Database["public"]["Enums"]["seizoen_status"]
        }
        Insert: {
          einddatum?: string | null
          id?: string
          naam: string
          organisatie_id: string
          startdatum?: string | null
          status?: Database["public"]["Enums"]["seizoen_status"]
        }
        Update: {
          einddatum?: string | null
          id?: string
          naam?: string
          organisatie_id?: string
          startdatum?: string | null
          status?: Database["public"]["Enums"]["seizoen_status"]
        }
        Relationships: [
          {
            foreignKeyName: "seizoen_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      selectie: {
        Row: {
          id: string
          organisatie_id: string
          seizoen_id: string
          speler_id: string
          team_id: string
        }
        Insert: {
          id?: string
          organisatie_id: string
          seizoen_id: string
          speler_id: string
          team_id: string
        }
        Update: {
          id?: string
          organisatie_id?: string
          seizoen_id?: string
          speler_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "selectie_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selectie_seizoen_id_organisatie_id_fkey"
            columns: ["seizoen_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "seizoen"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "selectie_speler_id_organisatie_id_fkey"
            columns: ["speler_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "speler"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "selectie_team_id_organisatie_id_fkey"
            columns: ["team_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id", "organisatie_id"]
          },
        ]
      }
      speelmoment: {
        Row: {
          datum: string | null
          id: string
          organisatie_id: string
          seizoen_id: string
          starttijden: string[]
          velden: string[]
          weekdag: number | null
        }
        Insert: {
          datum?: string | null
          id?: string
          organisatie_id: string
          seizoen_id: string
          starttijden?: string[]
          velden?: string[]
          weekdag?: number | null
        }
        Update: {
          datum?: string | null
          id?: string
          organisatie_id?: string
          seizoen_id?: string
          starttijden?: string[]
          velden?: string[]
          weekdag?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "speelmoment_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speelmoment_seizoen_id_organisatie_id_fkey"
            columns: ["seizoen_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "seizoen"
            referencedColumns: ["id", "organisatie_id"]
          },
        ]
      }
      speler: {
        Row: {
          foto_toestemming: boolean
          id: string
          naam: string
          organisatie_id: string
          rugnummer: number | null
          verborgen: boolean
        }
        Insert: {
          foto_toestemming?: boolean
          id?: string
          naam: string
          organisatie_id: string
          rugnummer?: number | null
          verborgen?: boolean
        }
        Update: {
          foto_toestemming?: boolean
          id?: string
          naam?: string
          organisatie_id?: string
          rugnummer?: number | null
          verborgen?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "speler_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      team: {
        Row: {
          foto_toestemming: boolean
          foto_url: string | null
          id: string
          naam: string
          organisatie_id: string
        }
        Insert: {
          foto_toestemming?: boolean
          foto_url?: string | null
          id?: string
          naam: string
          organisatie_id: string
        }
        Update: {
          foto_toestemming?: boolean
          foto_url?: string | null
          id?: string
          naam?: string
          organisatie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      veld: {
        Row: {
          id: string
          locatie_id: string
          naam: string
          organisatie_id: string
          volgorde: number
        }
        Insert: {
          id?: string
          locatie_id: string
          naam: string
          organisatie_id: string
          volgorde?: number
        }
        Update: {
          id?: string
          locatie_id?: string
          naam?: string
          organisatie_id?: string
          volgorde?: number
        }
        Relationships: [
          {
            foreignKeyName: "veld_locatie_id_organisatie_id_fkey"
            columns: ["locatie_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "locatie"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "veld_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
        ]
      }
      wedstrijd: {
        Row: {
          bracket_id: string | null
          datum: string | null
          fase_id: string
          id: string
          label: string | null
          organisatie_id: string
          poule_id: string | null
          ronde: number | null
          slot: number | null
          starttijd: string | null
          status: Database["public"]["Enums"]["wedstrijd_status"]
          thuis_team_id: string | null
          uit_team_id: string | null
          veld_id: string | null
          winnaar_naar_slot:
            | Database["public"]["Enums"]["wedstrijd_slot"]
            | null
          winnaar_naar_wedstrijd_id: string | null
        }
        Insert: {
          bracket_id?: string | null
          datum?: string | null
          fase_id: string
          id?: string
          label?: string | null
          organisatie_id: string
          poule_id?: string | null
          ronde?: number | null
          slot?: number | null
          starttijd?: string | null
          status?: Database["public"]["Enums"]["wedstrijd_status"]
          thuis_team_id?: string | null
          uit_team_id?: string | null
          veld_id?: string | null
          winnaar_naar_slot?:
            | Database["public"]["Enums"]["wedstrijd_slot"]
            | null
          winnaar_naar_wedstrijd_id?: string | null
        }
        Update: {
          bracket_id?: string | null
          datum?: string | null
          fase_id?: string
          id?: string
          label?: string | null
          organisatie_id?: string
          poule_id?: string | null
          ronde?: number | null
          slot?: number | null
          starttijd?: string | null
          status?: Database["public"]["Enums"]["wedstrijd_status"]
          thuis_team_id?: string | null
          uit_team_id?: string | null
          veld_id?: string | null
          winnaar_naar_slot?:
            | Database["public"]["Enums"]["wedstrijd_slot"]
            | null
          winnaar_naar_wedstrijd_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wedstrijd_bracket_id_fase_id_fkey"
            columns: ["bracket_id", "fase_id"]
            isOneToOne: false
            referencedRelation: "bracket"
            referencedColumns: ["id", "fase_id"]
          },
          {
            foreignKeyName: "wedstrijd_fase_id_organisatie_id_fkey"
            columns: ["fase_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "fase"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "wedstrijd_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedstrijd_poule_id_fase_id_fkey"
            columns: ["poule_id", "fase_id"]
            isOneToOne: false
            referencedRelation: "poule"
            referencedColumns: ["id", "fase_id"]
          },
          {
            foreignKeyName: "wedstrijd_thuis_team_id_organisatie_id_fkey"
            columns: ["thuis_team_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "wedstrijd_uit_team_id_organisatie_id_fkey"
            columns: ["uit_team_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "wedstrijd_veld_id_organisatie_id_fkey"
            columns: ["veld_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "veld"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "wedstrijd_winnaar_naar_wedstrijd_id_organisatie_id_fkey"
            columns: ["winnaar_naar_wedstrijd_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "wedstrijd"
            referencedColumns: ["id", "organisatie_id"]
          },
        ]
      }
      wedstrijd_event: {
        Row: {
          aangemaakt_op: string
          id: string
          minuut: number | null
          organisatie_id: string
          speler_id: string | null
          team_id: string
          type: Database["public"]["Enums"]["wedstrijd_event_type"]
          wedstrijd_id: string
        }
        Insert: {
          aangemaakt_op?: string
          id?: string
          minuut?: number | null
          organisatie_id: string
          speler_id?: string | null
          team_id: string
          type: Database["public"]["Enums"]["wedstrijd_event_type"]
          wedstrijd_id: string
        }
        Update: {
          aangemaakt_op?: string
          id?: string
          minuut?: number | null
          organisatie_id?: string
          speler_id?: string | null
          team_id?: string
          type?: Database["public"]["Enums"]["wedstrijd_event_type"]
          wedstrijd_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedstrijd_event_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedstrijd_event_speler_id_organisatie_id_fkey"
            columns: ["speler_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "speler"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "wedstrijd_event_team_id_organisatie_id_fkey"
            columns: ["team_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "wedstrijd_event_wedstrijd_id_organisatie_id_fkey"
            columns: ["wedstrijd_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "wedstrijd"
            referencedColumns: ["id", "organisatie_id"]
          },
        ]
      }
      wedstrijd_token: {
        Row: {
          aangemaakt_op: string
          organisatie_id: string
          token: string
          wedstrijd_id: string
        }
        Insert: {
          aangemaakt_op?: string
          organisatie_id: string
          token?: string
          wedstrijd_id: string
        }
        Update: {
          aangemaakt_op?: string
          organisatie_id?: string
          token?: string
          wedstrijd_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedstrijd_token_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedstrijd_token_wedstrijd_id_organisatie_id_fkey"
            columns: ["wedstrijd_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "wedstrijd"
            referencedColumns: ["id", "organisatie_id"]
          },
        ]
      }
      wedstrijd_uitslag: {
        Row: {
          handmatig: boolean
          organisatie_id: string
          reden: string | null
          score_thuis: number
          score_uit: number
          wedstrijd_id: string
          winnaar_na_strafschoppen_team_id: string | null
        }
        Insert: {
          handmatig?: boolean
          organisatie_id: string
          reden?: string | null
          score_thuis?: number
          score_uit?: number
          wedstrijd_id: string
          winnaar_na_strafschoppen_team_id?: string | null
        }
        Update: {
          handmatig?: boolean
          organisatie_id?: string
          reden?: string | null
          score_thuis?: number
          score_uit?: number
          wedstrijd_id?: string
          winnaar_na_strafschoppen_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wedstrijd_uitslag_organisatie_id_fkey"
            columns: ["organisatie_id"]
            isOneToOne: false
            referencedRelation: "organisatie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wedstrijd_uitslag_wedstrijd_id_organisatie_id_fkey"
            columns: ["wedstrijd_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "wedstrijd"
            referencedColumns: ["id", "organisatie_id"]
          },
          {
            foreignKeyName: "wedstrijd_uitslag_winnaar_na_strafschoppen_team_id_organis_fkey"
            columns: ["winnaar_na_strafschoppen_team_id", "organisatie_id"]
            isOneToOne: false
            referencedRelation: "team"
            referencedColumns: ["id", "organisatie_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deel_klassen_in: {
        Args: { p_fase_id: string; p_indeling: Json }
        Returns: undefined
      }
      is_ingelogde_niet_beheerder: {
        Args: { p_organisatie_id: string }
        Returns: boolean
      }
      is_lid: {
        Args: {
          p_organisatie_id: string
          p_rollen?: Database["public"]["Enums"]["lid_rol"][]
        }
        Returns: boolean
      }
      is_platform_beheerder: { Args: never; Returns: boolean }
      maak_seizoen: {
        Args: {
          p_einddatum?: string
          p_klassen: string[]
          p_kopieer_van?: string
          p_naam: string
          p_organisatie_id: string
          p_startdatum?: string
          p_toernooien?: string[]
        }
        Returns: string
      }
      standaard_regelset: { Args: never; Returns: Json }
      wedstrijd_uitslag_herbereken: {
        Args: { p_wedstrijd_id: string }
        Returns: undefined
      }
    }
    Enums: {
      fase_ranglijst: "per_poule" | "totaal"
      fase_type: "poule" | "handmatig" | "knockout"
      lid_rol: "beheerder" | "scheidsrechter" | "aanvoerder"
      onderdeel_vorm: "competitie" | "toernooi"
      seizoen_status: "concept" | "actief" | "afgesloten"
      wedstrijd_event_type:
        | "doelpunt"
        | "eigen_doelpunt"
        | "doelpunt_onbekend"
        | "geel"
        | "groen"
        | "rood"
      wedstrijd_slot: "thuis" | "uit"
      wedstrijd_status:
        | "gepland"
        | "bezig"
        | "bevestigd"
        | "afgelast"
        | "uitgesteld"
        | "gestaakt"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      fase_ranglijst: ["per_poule", "totaal"],
      fase_type: ["poule", "handmatig", "knockout"],
      lid_rol: ["beheerder", "scheidsrechter", "aanvoerder"],
      onderdeel_vorm: ["competitie", "toernooi"],
      seizoen_status: ["concept", "actief", "afgesloten"],
      wedstrijd_event_type: [
        "doelpunt",
        "eigen_doelpunt",
        "doelpunt_onbekend",
        "geel",
        "groen",
        "rood",
      ],
      wedstrijd_slot: ["thuis", "uit"],
      wedstrijd_status: [
        "gepland",
        "bezig",
        "bevestigd",
        "afgelast",
        "uitgesteld",
        "gestaakt",
      ],
    },
  },
} as const
