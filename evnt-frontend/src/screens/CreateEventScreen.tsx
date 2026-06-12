import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { distanceBetweenKm, reverseGeocodeWorldwide, searchPlacesWorldwide } from "../api/geocoding";
import { canRequestCurrentCoordinates, requestCurrentCoordinates } from "../application/location/currentPosition";
import { DateTimePickerField } from "../components/DateTimePickerField";
import { EventCard } from "../components/EventCard";
import { FormField } from "../components/FormField";
import { PillButton } from "../components/PillButton";
import { PlacePickerMap } from "../components/PlacePickerMap";
import { findCitySuggestion } from "../data/cities";
import {
  categoryColors,
  getDefaultEventImage,
  categorySoftColors,
  eventSubcategories,
  getEventSubcategoryLabel
} from "../data/events";
import { placeSuggestions, type PlaceSuggestion } from "../data/places";
import { colors, form, radius, shadow, spacing } from "../theme";
import { Category, ChatMode, Coordinates, EvntEvent, UserProfile } from "../types";

type CreateEventScreenProps = {
  draft?: CreateEventDraft | null;
  initialEvent?: EvntEvent;
  onCancel?: () => void;
  user: UserProfile;
  onCreate: (event: EvntEvent) => boolean | void;
  onDraftChange?: (draft: CreateEventDraft | null) => void;
  onUpdate?: (event: EvntEvent) => boolean | void;
};

export type CreateEventDraft = {
  address: string;
  capacity: string;
  category: Category;
  chatMode: ChatMode;
  countCreator: boolean;
  customSubcategory: string;
  date: string;
  description: string;
  manualCoordinates: Coordinates | null;
  place: string;
  price: string;
  selectedPlace: PlaceSuggestion | null;
  selectedSubcategory: string;
  step: number;
  time: string;
  title: string;
};

type CreateField =
  | "capacity"
  | "date"
  | "description"
  | "place"
  | "price"
  | "subcategory"
  | "time"
  | "title";
type CreateFieldErrors = Partial<Record<CreateField, string>>;

type EventTypeOption = {
  emoji: string;
  label: string;
  category: Category;
};

const eventTypes: EventTypeOption[] = [
  { emoji: "🌙", label: "Serate", category: "Serata" },
  { emoji: "⚽", label: "Sport", category: "Sport" },
  { emoji: "🎸", label: "Concerti", category: "Concerto" },
  { emoji: "🍔", label: "Food", category: "Food" },
  { emoji: "🤝", label: "Social", category: "Social" },
  { emoji: "🎨", label: "Arte", category: "Arte" },
  { emoji: "💻", label: "Tech", category: "Tech" },
  { emoji: "🧘", label: "Benessere", category: "Benessere" },
  { emoji: "🧳", label: "Viaggi", category: "Viaggi" },
  { emoji: "🎮", label: "Gaming", category: "Gaming" },
  { emoji: "🎬", label: "Cinema", category: "Cinema" }
];

const createPrimary = colors.primary;
const createPrimarySoft = colors.surfaceMuted;
const customSubcategoryOption = "Altro";
const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const monthNames = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const maxTitleLength = 90;
const maxDescriptionLength = 500;
const maxCustomSubcategoryLength = 50;
const maxAddressLength = 180;
const maxCapacity = 10000;
const maxPrice = 10000;
const pendingMapAddressLabel = "Indirizzo in verifica...";

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getDefaultEventDateTime() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(19, 0, 0, 0);
  if (target.getTime() < now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return {
    date: toIsoDate(target),
    time: toTimeValue(target)
  };
}

function localEventDateTime(date: string, time: string) {
  const parsed = new Date(`${date}T${time || "00:00"}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatEventDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return isToday ? "Oggi" : `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function hasCreateErrors(errors: CreateFieldErrors) {
  return Object.keys(errors).length > 0;
}

function placeSuggestionKey(suggestion: PlaceSuggestion, index: number) {
  const { latitude, longitude } = suggestion.coordinates;
  return [
    suggestion.name,
    suggestion.address,
    suggestion.city,
    latitude.toFixed(5),
    longitude.toFixed(5),
    index
  ].join("-");
}

function eventTypeForCategory(category?: Category) {
  return eventTypes.find((item) => item.category === category) ?? eventTypes[1];
}

function dateTimeFromEvent(event?: EvntEvent) {
  if (!event?.dateTimeIso) {
    return getDefaultEventDateTime();
  }

  const parsed = new Date(event.dateTimeIso);
  return Number.isNaN(parsed.getTime())
    ? getDefaultEventDateTime()
    : { date: toIsoDate(parsed), time: toTimeValue(parsed) };
}

function initialSubcategoryForDraft(type: EventTypeOption, draft?: CreateEventDraft | null) {
  const draftSubcategory = draft?.selectedSubcategory;
  if (
    draftSubcategory &&
    (draftSubcategory === customSubcategoryOption || eventSubcategories[type.category].includes(draftSubcategory))
  ) {
    return draftSubcategory;
  }

  return eventSubcategories[type.category][0];
}

export function CreateEventScreen({
  draft,
  initialEvent,
  onCancel,
  user,
  onCreate,
  onDraftChange,
  onUpdate
}: CreateEventScreenProps) {
  const editing = Boolean(initialEvent);
  const initialDraft = editing ? undefined : draft ?? undefined;
  const [step, setStep] = useState(initialDraft?.step ?? 0);
  const [selectedType, setSelectedType] = useState(() =>
    eventTypeForCategory(initialEvent?.category ?? initialDraft?.category)
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState(() => {
    const type = eventTypeForCategory(initialEvent?.category ?? initialDraft?.category);
    return initialSubcategoryForDraft(type, initialDraft);
  });
  const [customSubcategory, setCustomSubcategory] = useState(initialDraft?.customSubcategory ?? "");
  const [subcategorySelectOpen, setSubcategorySelectOpen] = useState(false);
  const [title, setTitle] = useState(initialEvent?.title ?? initialDraft?.title ?? "");
  const [description, setDescription] = useState(initialEvent?.description ?? initialDraft?.description ?? "");
  const [place, setPlace] = useState(initialEvent?.place ?? initialDraft?.place ?? "");
  const [address, setAddress] = useState(initialEvent?.address ?? initialDraft?.address ?? "");
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(initialDraft?.selectedPlace ?? null);
  const [manualCoordinates, setManualCoordinates] = useState<Coordinates | null>(
    initialEvent?.coordinates ?? initialDraft?.manualCoordinates ?? null
  );
  const [placeMapOpen, setPlaceMapOpen] = useState(false);
  const [placeSuggestionsOpen, setPlaceSuggestionsOpen] = useState(false);
  const [remotePlaceSuggestions, setRemotePlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [locatingPlace, setLocatingPlace] = useState(false);
  const [canLocatePlace, setCanLocatePlace] = useState(false);
  const [date, setDate] = useState(() => initialDraft?.date ?? dateTimeFromEvent(initialEvent).date);
  const [time, setTime] = useState(() => initialDraft?.time ?? dateTimeFromEvent(initialEvent).time);
  const [capacity, setCapacity] = useState(
    initialEvent?.capacity ? String(initialEvent.capacity) : initialDraft?.capacity ?? ""
  );
  const [countCreator, setCountCreator] = useState(
    initialEvent?.creatorCountsAsParticipant ?? initialDraft?.countCreator ?? true
  );
  const [price, setPrice] = useState(initialEvent?.price ? String(initialEvent.price) : initialDraft?.price ?? "");
  const [chatMode, setChatMode] = useState<ChatMode>(initialEvent?.chatMode ?? initialDraft?.chatMode ?? "Gruppo aperto");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CreateFieldErrors>({});
  const [publishing, setPublishing] = useState(false);
  const reverseLookupId = useRef(0);
  const locationPrefilledRef = useRef(Boolean(initialEvent ?? initialDraft?.address ?? initialDraft?.place));

  const parsedPrice = useMemo(() => Number.parseFloat(price.replace(",", ".")), [price]);
  const parsedCapacity = useMemo(() => Number.parseInt(capacity, 10), [capacity]);
  const isFree = !Number.isFinite(parsedPrice) || parsedPrice <= 0;
  const selectedAccent = categoryColors[selectedType.category];
  const selectedSubcategories = eventSubcategories[selectedType.category];
  const subcategoryOptions = useMemo(
    () => [...selectedSubcategories, customSubcategoryOption],
    [selectedSubcategories]
  );
  const selectedSubcategoryIsCustom = selectedSubcategory === customSubcategoryOption;
  const effectiveSubcategory = selectedSubcategoryIsCustom ? customSubcategory.trim() : selectedSubcategory;
  const subcategoryDisplay = selectedSubcategoryIsCustom
    ? customSubcategory.trim() || customSubcategoryOption
    : selectedSubcategory;
  const minimumEventDate = useMemo(() => new Date(), []);
  const eventDateTime = useMemo(() => localEventDateTime(date, time), [date, time]);
  const eventIsInPast = eventDateTime ? eventDateTime.getTime() < Date.now() : true;
  const originCoordinates = user.cityCoordinates ?? findCitySuggestion(user.city)?.coordinates;
  const placeCoordinates = selectedPlace?.coordinates ?? manualCoordinates ?? initialEvent?.coordinates ?? originCoordinates;
  const addressInputValue = address || place;
  const previewEvent = useMemo<EvntEvent>(() => {
    const previewSubcategory = effectiveSubcategory || subcategoryDisplay;
    const previewAddress = addressInputValue.trim() || "Indirizzo";
    const previewPlace = place.trim() || selectedPlace?.name || previewAddress;
    const previewCoordinates = placeCoordinates ?? originCoordinates ?? { latitude: 41.9028, longitude: 12.4964 };

    return {
      id: initialEvent?.id ?? "preview-event",
      title: title.trim() || "Titolo evento",
      category: selectedType.category,
      date: date ? formatEventDateLabel(date) : "Data",
      time: time.trim() || "--:--",
      place: previewPlace,
      city: selectedPlace?.city ?? initialEvent?.city ?? user.city,
      address: previewAddress,
      province: selectedPlace?.province ?? initialEvent?.province,
      region: selectedPlace?.region ?? initialEvent?.region,
      postcode: selectedPlace?.postcode ?? initialEvent?.postcode,
      countryCode: selectedPlace?.countryCode ?? initialEvent?.countryCode ?? "IT",
      price: isFree ? 0 : parsedPrice,
      distanceKm: selectedPlace?.distanceKm ?? initialEvent?.distanceKm ?? 0,
      affinity: initialEvent?.affinity ?? 80,
      popularity: initialEvent?.popularity ?? 50,
      participants: initialEvent?.participants ?? (countCreator ? 1 : 0),
      capacity: Number.isFinite(parsedCapacity) && parsedCapacity > 0 ? parsedCapacity : null,
      image:
        initialEvent?.category === selectedType.category && initialEvent.image
          ? initialEvent.image
          : getDefaultEventImage(selectedType.category, previewSubcategory),
      description: description.trim() || "Descrizione evento",
      organizer: user.name,
      chatMode,
      tags: [
        selectedType.label.toLowerCase(),
        previewSubcategory.toLowerCase(),
        `subcategory:${previewSubcategory}`,
        user.city ? `city:${user.city}` : ""
      ].filter(Boolean),
      coordinates: previewCoordinates,
      dateTimeIso: eventDateTime?.toISOString(),
      creatorCountsAsParticipant: editing ? initialEvent?.creatorCountsAsParticipant : countCreator,
      status: initialEvent?.status,
      subcategory: previewSubcategory
    };
  }, [
    addressInputValue,
    chatMode,
    countCreator,
    date,
    description,
    editing,
    effectiveSubcategory,
    eventDateTime,
    initialEvent,
    isFree,
    originCoordinates,
    parsedCapacity,
    parsedPrice,
    place,
    placeCoordinates,
    selectedPlace,
    selectedType,
    subcategoryDisplay,
    time,
    title,
    user.city,
    user.name
  ]);

  useEffect(() => {
    const draftSource = initialEvent ? undefined : draft ?? undefined;
    const type = eventTypeForCategory(initialEvent?.category ?? draftSource?.category);
    const nextDateTime = dateTimeFromEvent(initialEvent);
    const nextSubcategory = initialEvent ? getEventSubcategoryLabel(initialEvent) : eventSubcategories[type.category][0];
    const knownSubcategory = eventSubcategories[type.category].includes(nextSubcategory);

    setStep(draftSource?.step ?? 0);
    setSelectedType(type);
    setSelectedSubcategory(
      initialEvent
        ? knownSubcategory
          ? nextSubcategory
          : customSubcategoryOption
        : initialSubcategoryForDraft(type, draftSource)
    );
    setCustomSubcategory(initialEvent ? (knownSubcategory ? "" : nextSubcategory) : draftSource?.customSubcategory ?? "");
    setSubcategorySelectOpen(false);
    setTitle(initialEvent?.title ?? draftSource?.title ?? "");
    setDescription(initialEvent?.description ?? draftSource?.description ?? "");
    setPlace(initialEvent?.place ?? draftSource?.place ?? "");
    setAddress(initialEvent?.address ?? draftSource?.address ?? "");
    setSelectedPlace(draftSource?.selectedPlace ?? null);
    setManualCoordinates(initialEvent?.coordinates ?? draftSource?.manualCoordinates ?? null);
    setPlaceMapOpen(false);
    setPlaceSuggestionsOpen(false);
    setRemotePlaceSuggestions([]);
    setPlaceSearching(false);
    setReverseGeocoding(false);
    setLocatingPlace(false);
    setCanLocatePlace(false);
    locationPrefilledRef.current = Boolean(initialEvent ?? draftSource?.address ?? draftSource?.place);
    setDate(draftSource?.date ?? nextDateTime.date);
    setTime(draftSource?.time ?? nextDateTime.time);
    setCapacity(initialEvent?.capacity ? String(initialEvent.capacity) : draftSource?.capacity ?? "");
    setCountCreator(initialEvent?.creatorCountsAsParticipant ?? draftSource?.countCreator ?? true);
    setPrice(initialEvent?.price ? String(initialEvent.price) : draftSource?.price ?? "");
    setChatMode(initialEvent?.chatMode ?? draftSource?.chatMode ?? "Gruppo aperto");
    setFormError("");
    setFieldErrors({});
    setPublishing(false);
  }, [initialEvent?.id]);

  useEffect(() => {
    if (selectedSubcategory === customSubcategoryOption) {
      return;
    }
    if (!selectedSubcategories.includes(selectedSubcategory)) {
      setSelectedSubcategory(selectedSubcategories[0]);
    }
  }, [selectedSubcategories, selectedSubcategory]);

  useEffect(() => {
    if (editing) {
      return;
    }

    onDraftChange?.({
      address,
      capacity,
      category: selectedType.category,
      chatMode,
      countCreator,
      customSubcategory,
      date,
      description,
      manualCoordinates,
      place,
      price,
      selectedPlace,
      selectedSubcategory,
      step,
      time,
      title
    });
  }, [
    address,
    capacity,
    chatMode,
    countCreator,
    customSubcategory,
    date,
    description,
    editing,
    manualCoordinates,
    onDraftChange,
    place,
    price,
    selectedPlace,
    selectedSubcategory,
    selectedType.category,
    step,
    time,
    title
  ]);

  useEffect(() => {
    const normalized = addressInputValue.trim();
    if (!placeSuggestionsOpen || normalized.length < 2) {
      setRemotePlaceSuggestions([]);
      setPlaceSearching(false);
      return;
    }

    let cancelled = false;
    setPlaceSearching(true);
    const timeout = setTimeout(() => {
      searchPlacesWorldwide(normalized, originCoordinates)
        .then((suggestions) => {
          if (!cancelled) {
            setRemotePlaceSuggestions(suggestions);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRemotePlaceSuggestions([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setPlaceSearching(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [addressInputValue, originCoordinates, placeSuggestionsOpen]);

  useEffect(() => {
    let cancelled = false;
    canRequestCurrentCoordinates()
      .then((available) => {
        if (!cancelled) {
          setCanLocatePlace(available);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCanLocatePlace(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialEvent?.id]);

  useEffect(() => {
    if (editing || locationPrefilledRef.current) {
      return;
    }
    if (addressInputValue.trim() || manualCoordinates || selectedPlace) {
      locationPrefilledRef.current = true;
      return;
    }

    locationPrefilledRef.current = true;
    void useCurrentEventLocation({ silent: true });
  }, [addressInputValue, editing, manualCoordinates, originCoordinates, selectedPlace]);

  const filteredPlaceSuggestions = useMemo(() => {
    const normalized = addressInputValue.trim().toLowerCase();
    if (normalized.length < 2) {
      return [];
    }

    const localSuggestions = placeSuggestions
      .filter((item) => {
        const searchable = `${item.name} ${item.address} ${item.city}`.toLowerCase();
        return searchable.includes(normalized);
      })
      .map((suggestion) => ({
        ...suggestion,
        distanceKm: originCoordinates
          ? distanceBetweenKm(originCoordinates, suggestion.coordinates)
          : suggestion.distanceKm
      }));

    return [...remotePlaceSuggestions, ...localSuggestions]
      .filter(
        (suggestion, index, all) =>
          all.findIndex(
            (item) =>
              item.name.toLowerCase() === suggestion.name.toLowerCase() &&
              item.address.toLowerCase() === suggestion.address.toLowerCase()
          ) === index
      )
      .slice(0, 8);
  }, [addressInputValue, originCoordinates, remotePlaceSuggestions]);

  const clearFieldError = (field: CreateField) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError("");
  };

  const validateStep = (targetStep: number) => {
    const errors: CreateFieldErrors = {};

    if (targetStep === 0) {
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 3) {
        errors.title = "Inserisci un titolo di almeno 3 caratteri.";
      } else if (trimmedTitle.length > maxTitleLength) {
        errors.title = `Il titolo puo contenere al massimo ${maxTitleLength} caratteri.`;
      }
      if (description.length > maxDescriptionLength) {
        errors.description = `La descrizione puo contenere al massimo ${maxDescriptionLength} caratteri.`;
      }
      if (effectiveSubcategory.length < 2) {
        errors.subcategory = "Seleziona una sottocategoria oppure scrivine una personalizzata.";
      } else if (effectiveSubcategory.length > maxCustomSubcategoryLength) {
        errors.subcategory = `La sottocategoria puo contenere al massimo ${maxCustomSubcategoryLength} caratteri.`;
      }
    }

    if (targetStep === 1) {
      const normalizedCapacity = capacity.trim();
      const normalizedPrice = price.trim();
      const normalizedAddress = addressInputValue.trim();
      if (normalizedAddress.length < 2) {
        errors.place = "Inserisci l'indirizzo dell'evento.";
      } else if (normalizedAddress.length > maxAddressLength) {
        errors.place = `L'indirizzo puo contenere al massimo ${maxAddressLength} caratteri.`;
      }
      if (!date) {
        errors.date = "Seleziona una data.";
      }
      if (!time) {
        errors.time = "Seleziona un orario.";
      }
      if (date && time && eventIsInPast) {
        errors.time = "Data e orario non possono essere antecedenti a ora.";
      }
      if (normalizedCapacity && !/^\d+$/.test(normalizedCapacity)) {
        errors.capacity = "Inserisci un numero intero oppure lascia vuoto.";
      } else if (normalizedCapacity && Number.isFinite(parsedCapacity) && parsedCapacity <= 0) {
        errors.capacity = "Lascia vuoto per posti illimitati oppure inserisci un numero maggiore di 0.";
      } else if (Number.isFinite(parsedCapacity) && parsedCapacity > maxCapacity) {
        errors.capacity = `Massimo ${maxCapacity} posti.`;
      }
      if (normalizedPrice && !/^\d+([,.]\d{1,2})?$/.test(normalizedPrice)) {
        errors.price = "Inserisci un costo valido, es. 8 oppure 8,50.";
      } else if (Number.isFinite(parsedPrice) && parsedPrice > maxPrice) {
        errors.price = `Costo massimo EUR ${maxPrice}.`;
      }
    }

    return errors;
  };

  const validateBeforePublish = () => {
    const errors = {
      ...validateStep(0),
      ...validateStep(1)
    };
    return errors;
  };

  const showCreateErrors = (errors: CreateFieldErrors) => {
    setFieldErrors(errors);
    setFormError("Controlla i campi evidenziati prima di continuare.");
  };

  const resetForm = () => {
    if (editing) {
      onCancel?.();
      return;
    }

    const nextDefault = getDefaultEventDateTime();
    setStep(0);
    setSelectedType(eventTypes[1]);
    setSelectedSubcategory(eventSubcategories[eventTypes[1].category][0]);
    setCustomSubcategory("");
    setSubcategorySelectOpen(false);
    setTitle("");
    setDescription("");
    setPlace("");
    setAddress("");
    setSelectedPlace(null);
    setManualCoordinates(null);
    setPlaceMapOpen(false);
    setPlaceSuggestionsOpen(false);
    setReverseGeocoding(false);
    setDate(nextDefault.date);
    setTime(nextDefault.time);
    setCapacity("");
    setCountCreator(true);
    setPrice("");
    setChatMode("Gruppo aperto");
    setFormError("");
    setFieldErrors({});
    setPublishing(false);
    onDraftChange?.(null);
  };

  const publish = async () => {
    if (publishing) {
      return;
    }

    setPublishing(true);
    const dateTime = eventDateTime ?? new Date();
    const subcategory = effectiveSubcategory;
    const normalizedAddress = addressInputValue.trim();
    const canReuseInitialPlace =
      Boolean(initialEvent?.coordinates) &&
      [initialEvent?.place, initialEvent?.address]
        .filter(Boolean)
        .some((value) => normalizedAddress.toLowerCase() === value?.trim().toLowerCase());
    let resolvedPlace =
      selectedPlace?.address === pendingMapAddressLabel ? null : selectedPlace;

    if (!resolvedPlace && manualCoordinates) {
      resolvedPlace = await reverseGeocodeWorldwide(manualCoordinates, originCoordinates).catch(() => null);
      if (resolvedPlace) {
        setSelectedPlace(resolvedPlace);
        setManualCoordinates(resolvedPlace.coordinates);
        setAddress(resolvedPlace.address);
        setPlace(resolvedPlace.name);
        setPlaceSuggestionsOpen(false);
      }
    }

    if (!resolvedPlace && !canReuseInitialPlace) {
      const [fallbackPlace] =
        filteredPlaceSuggestions.length > 0
          ? filteredPlaceSuggestions
          : await searchPlacesWorldwide(normalizedAddress, originCoordinates).catch(() => []);
      resolvedPlace = fallbackPlace ?? null;

      if (resolvedPlace) {
        setSelectedPlace(resolvedPlace);
        setAddress((current) => current.trim() || resolvedPlace?.address || "");
        setPlace((current) => current.trim() || resolvedPlace?.name || "");
        setPlaceSuggestionsOpen(false);
      }
    }

    const coordinates = resolvedPlace?.coordinates ?? (canReuseInitialPlace ? initialEvent?.coordinates : undefined);
    if (!coordinates) {
      showCreateErrors({ place: "Seleziona un indirizzo dai suggerimenti o sposta il POI sulla mappa." });
      setStep(1);
      setPublishing(false);
      return;
    }

    const eventCity = resolvedPlace?.city || (canReuseInitialPlace ? initialEvent?.city : undefined) || user.city;
    const eventPlace =
      (resolvedPlace?.name ?? (canReuseInitialPlace ? initialEvent?.place : undefined) ?? place.trim()) ||
      normalizedAddress;
    const typedAddress = normalizedAddress === pendingMapAddressLabel ? "" : normalizedAddress;
    const eventAddress = resolvedPlace?.address ?? (typedAddress || initialEvent?.address || eventPlace);
    const event: EvntEvent = {
      id: initialEvent?.id ?? `created-${Date.now()}`,
      title: title.trim(),
      category: selectedType.category,
      date: formatEventDateLabel(date),
      time: time.trim(),
      place: eventPlace,
      city: eventCity,
      address: eventAddress,
      province: resolvedPlace?.province ?? (canReuseInitialPlace ? initialEvent?.province : undefined),
      region: resolvedPlace?.region ?? (canReuseInitialPlace ? initialEvent?.region : undefined),
      postcode: resolvedPlace?.postcode ?? (canReuseInitialPlace ? initialEvent?.postcode : undefined),
      countryCode:
        resolvedPlace?.countryCode ?? (canReuseInitialPlace ? initialEvent?.countryCode : undefined) ?? "IT",
      price: isFree ? 0 : parsedPrice,
      distanceKm: resolvedPlace?.distanceKm ?? initialEvent?.distanceKm ?? 0,
      affinity: initialEvent?.affinity ?? 0,
      popularity: initialEvent?.popularity ?? 0,
      participants: initialEvent?.participants ?? (countCreator ? 1 : 0),
      capacity: Number.isFinite(parsedCapacity) && parsedCapacity > 0 ? parsedCapacity : null,
      image:
        initialEvent?.category === selectedType.category && initialEvent.image
          ? initialEvent.image
          : getDefaultEventImage(selectedType.category, subcategory),
      description: description.trim(),
      organizer: user.name,
      chatMode,
      tags: [
        selectedType.label.toLowerCase(),
        subcategory.toLowerCase(),
        `subcategory:${subcategory}`,
        eventCity ? `city:${eventCity}` : ""
      ].filter(Boolean),
      coordinates,
      dateTimeIso: dateTime.toISOString(),
      creatorCountsAsParticipant: editing ? initialEvent?.creatorCountsAsParticipant : countCreator,
      status: initialEvent?.status,
      subcategory
    };

    if (editing) {
      const handled = onUpdate?.(event);
      if (handled === false) {
        setPublishing(false);
        return;
      }
      return;
    }

    const handled = onCreate(event);
    if (handled === false) {
      setPublishing(false);
      return;
    }
  };

  const goBack = () => {
    setFormError("");
    setFieldErrors({});
    if (step === 0) {
      resetForm();
      return;
    }
    setStep((current) => current - 1);
  };

  const goNext = async () => {
    const errors = step === 2 ? validateBeforePublish() : validateStep(step);
    if (hasCreateErrors(errors)) {
      showCreateErrors(errors);
      if (step === 2) {
        setStep(errors.title || errors.description ? 0 : 1);
      }
      return;
    }

    setFormError("");
    setFieldErrors({});
    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }
    await publish();
  };

  const handlePlaceChange = (value: string) => {
    setPlace(value);
    setAddress(value);
    clearFieldError("place");
    setSelectedPlace(null);
    setPlaceSuggestionsOpen(value.trim().length > 1);
  };

  const choosePlace = (suggestion: PlaceSuggestion) => {
    setPlace(suggestion.name);
    setAddress(suggestion.address);
    setSelectedPlace(suggestion);
    setManualCoordinates(suggestion.coordinates);
    clearFieldError("place");
    setPlaceSuggestionsOpen(false);
  };

  const fallbackPlaceFromCoordinates = (coordinates: Coordinates, name: string): PlaceSuggestion => ({
    address: user.city ? `Centro di ${user.city}` : "Coordinate selezionate",
    city: user.city,
    countryCode: "IT",
    coordinates,
    distanceKm: originCoordinates ? distanceBetweenKm(originCoordinates, coordinates) : 0,
    name
  });

  const chooseMapCoordinates = (coordinates: Coordinates, fallbackName = "Luogo selezionato sulla mappa") => {
    const lookupId = reverseLookupId.current + 1;
    reverseLookupId.current = lookupId;
    const manualPlace: PlaceSuggestion = {
      address: pendingMapAddressLabel,
      city: user.city,
      countryCode: "IT",
      coordinates,
      distanceKm: originCoordinates ? distanceBetweenKm(originCoordinates, coordinates) : 0,
      name: fallbackName
    };

    setManualCoordinates(coordinates);
    setSelectedPlace(manualPlace);
    setPlace(fallbackName);
    setAddress(pendingMapAddressLabel);
    clearFieldError("place");
    setReverseGeocoding(true);

    void reverseGeocodeWorldwide(coordinates, originCoordinates)
      .then((resolvedPlace) => {
        if (reverseLookupId.current !== lookupId) {
          return;
        }

        const nextPlace = resolvedPlace ?? fallbackPlaceFromCoordinates(coordinates, fallbackName);
        setManualCoordinates(nextPlace.coordinates);
        setSelectedPlace(nextPlace);
        setPlace(nextPlace.name);
        setAddress(nextPlace.address);
        setFormError("");
      })
      .catch(() => {
        if (reverseLookupId.current === lookupId) {
          const fallbackPlace = fallbackPlaceFromCoordinates(coordinates, fallbackName);
          setSelectedPlace(fallbackPlace);
          setPlace(fallbackPlace.name);
          setAddress(fallbackPlace.address);
          setFormError("");
        }
      })
      .finally(() => {
        if (reverseLookupId.current === lookupId) {
          setReverseGeocoding(false);
        }
      });
  };

  async function useCurrentEventLocation(options: { silent?: boolean } = {}) {
    if (locatingPlace) {
      return;
    }

    setLocatingPlace(true);
    const currentCoordinates = await requestCurrentCoordinates();
    setCanLocatePlace(Boolean(currentCoordinates));
    const coordinates = currentCoordinates ?? originCoordinates;

    if (!coordinates) {
      if (!options.silent) {
        setFormError("Non riesco a recuperare la posizione attuale. Inserisci l'indirizzo manualmente.");
      }
      setLocatingPlace(false);
      return;
    }

    chooseMapCoordinates(coordinates, currentCoordinates ? "Posizione attuale" : user.city || "Centro città");
    setLocatingPlace(false);
  }

  const chooseSubcategory = (value: string) => {
    setSelectedSubcategory(value);
    if (value !== customSubcategoryOption) {
      setCustomSubcategory("");
    }
    clearFieldError("subcategory");
    setSubcategorySelectOpen(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
      style={styles.root}
    >
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="Indietro" accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Ionicons color={colors.ink} name="arrow-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{editing ? "Modifica evento" : "Nuovo evento"}</Text>
        <Pressable
          accessibilityLabel="Annulla creazione evento"
          accessibilityRole="button"
          onPress={resetForm}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Annulla</Text>
        </Pressable>
      </View>

      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.container}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.progressRow}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={[styles.progressDot, item <= step && styles.progressDotActive]} />
          ))}
        </View>
        {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

        {step === 0 && (
          <View style={styles.panel}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Racconta l'evento</Text>
              <Text style={styles.stepSubtitle}>Scegli categoria, sottocategoria e aggiungi le informazioni principali.</Text>
            </View>
            <FormField label="Tipo di evento">
              <View style={styles.typeGrid}>
                {eventTypes.map((item) => {
                  const selected = selectedType.label === item.label;
                  const accent = categoryColors[item.category];
                  const soft = categorySoftColors[item.category];
                  return (
                    <PillButton
                      accent={accent}
                      accessibilityLabel={`Seleziona tipo evento ${item.label}`}
                      emoji={item.emoji}
                      key={item.label}
                      label={item.label}
                      onPress={() => {
                        setSelectedType(item);
                        setSelectedSubcategory(eventSubcategories[item.category][0]);
                        setCustomSubcategory("");
                      }}
                      selected={selected}
                      soft={soft}
                    />
                  );
                })}
              </View>
            </FormField>

            <FormField
              error={fieldErrors.subcategory && !selectedSubcategoryIsCustom ? fieldErrors.subcategory : undefined}
              label="Sottocategoria"
            >
              <Pressable
                accessibilityLabel="Seleziona sottocategoria"
                accessibilityRole="button"
                onPress={() => setSubcategorySelectOpen(true)}
                style={[styles.selectButton, fieldErrors.subcategory && styles.inputError]}
              >
                <Text style={styles.selectText}>{subcategoryDisplay}</Text>
                <Ionicons color={colors.muted} name="chevron-down" size={20} />
              </Pressable>
            </FormField>

            {selectedSubcategoryIsCustom && (
              <Field error={fieldErrors.subcategory} label="Sottocategoria personalizzata *">
                <TextInput
                  autoCapitalize="sentences"
                  maxLength={maxCustomSubcategoryLength}
                  onChangeText={(value) => {
                    setCustomSubcategory(value);
                    clearFieldError("subcategory");
                  }}
                  placeholder="Es. Beach volley, Poetry slam..."
                  placeholderTextColor={form.placeholder.color}
                  style={styles.input}
                  value={customSubcategory}
                />
              </Field>
            )}

            <Field error={fieldErrors.title} label="Titolo *">
              <TextInput
                onChangeText={(value) => {
                  setTitle(value);
                  clearFieldError("title");
                }}
                placeholder={`Es. ${effectiveSubcategory || "Evento"} - cercasi 3`}
                placeholderTextColor={form.placeholder.color}
                style={styles.input}
                value={title}
              />
            </Field>

            <Field error={fieldErrors.description} label="Descrizione">
              <TextInput
                multiline
                onChangeText={(value) => {
                  setDescription(value);
                  clearFieldError("description");
                }}
                placeholder="Di cosa si tratta..."
                placeholderTextColor={form.placeholder.color}
                style={[styles.input, styles.textArea]}
                value={description}
              />
            </Field>
          </View>
        )}

        {step === 1 && (
          <View style={styles.panel}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Dove e quando</Text>
              <Text style={styles.stepSubtitle}>Imposta indirizzo, data, partecipanti e regole della chat.</Text>
            </View>
            <Field error={fieldErrors.place} label="Indirizzo *">
              <View style={styles.autocompleteWrap}>
                <View style={styles.placeInputWrap}>
                  <TextInput
                    autoCorrect={false}
                    onBlur={() => setTimeout(() => setPlaceSuggestionsOpen(false), 120)}
                    onChangeText={handlePlaceChange}
                    onFocus={() => setPlaceSuggestionsOpen(addressInputValue.trim().length > 1)}
                    placeholder="Es. Via Roma 10, Milano"
                    placeholderTextColor={form.placeholder.color}
                    style={styles.placeInput}
                    value={addressInputValue}
                  />
                  {canLocatePlace ? (
                    <Pressable
                      accessibilityLabel="Usa la posizione attuale come indirizzo"
                      accessibilityRole="button"
                      disabled={locatingPlace || reverseGeocoding}
                      hitSlop={8}
                      onPress={() => void useCurrentEventLocation()}
                      style={[styles.locateFieldButton, (locatingPlace || reverseGeocoding) && styles.locateFieldButtonDisabled]}
                    >
                      <Ionicons color={selectedPlace ? colors.ink : colors.muted} name="locate-outline" size={20} />
                    </Pressable>
                  ) : null}
                </View>

                {placeSuggestionsOpen && filteredPlaceSuggestions.length > 0 && (
                  <View style={styles.suggestionList}>
                    {filteredPlaceSuggestions.map((suggestion, index) => (
                      <Pressable
                        accessibilityLabel={`Seleziona indirizzo ${suggestion.name}, ${suggestion.address}`}
                        accessibilityRole="button"
                        key={placeSuggestionKey(suggestion, index)}
                        onPress={() => choosePlace(suggestion)}
                        style={styles.suggestionRow}
                      >
                        <View style={styles.suggestionIcon}>
                          <Ionicons color={colors.ink} name="location-outline" size={18} />
                        </View>
                        <View style={styles.suggestionCopy}>
                          <Text style={styles.suggestionTitle}>{suggestion.name}</Text>
                          <Text numberOfLines={1} style={styles.suggestionMeta}>
                            {suggestion.address}
                          </Text>
                        </View>
                        <Text style={styles.suggestionDistance}>{suggestion.distanceKm.toFixed(1)} km</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {placeSuggestionsOpen && placeSearching && filteredPlaceSuggestions.length === 0 && (
                  <View style={styles.suggestionList}>
                    <View style={styles.suggestionRow}>
                      <View style={styles.suggestionIcon}>
                        <Ionicons color={colors.ink} name="globe-outline" size={18} />
                      </View>
                      <View style={styles.suggestionCopy}>
                        <Text style={styles.suggestionTitle}>Cerco indirizzi...</Text>
                        <Text style={styles.suggestionMeta}>OpenStreetMap</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </Field>

            <FormField
              helper={reverseGeocoding ? "Aggiorno l'indirizzo dal POI..." : "Puoi scegliere un suggerimento oppure spostare il POI direttamente sulla mappa."}
              label="Posizione sulla mappa"
            >
              <PlacePickerMap
                category={selectedType.category}
                coordinates={placeCoordinates}
                fallbackCoordinates={originCoordinates}
                onChange={chooseMapCoordinates}
                onExpand={() => setPlaceMapOpen(true)}
              />
            </FormField>

            <View style={styles.inlineFields}>
              <Field compact error={fieldErrors.date} label="Data *">
                <DateTimePickerField
                  minimumDate={minimumEventDate}
                  mode="date"
                  onChange={(value) => {
                    setDate(value);
                    clearFieldError("date");
                    clearFieldError("time");
                  }}
                  placeholder="Seleziona"
                  value={date}
                />
              </Field>
              <Field compact error={fieldErrors.time} label="Orario *">
                <DateTimePickerField
                  mode="time"
                  onChange={(value) => {
                    setTime(value);
                    clearFieldError("time");
                  }}
                  placeholder="--:--"
                  value={time}
                />
              </Field>
            </View>
            {eventIsInPast && (
              <Text style={styles.warningText}>Scegli una data e un orario non antecedenti a oggi.</Text>
            )}

            <View style={styles.inlineFields}>
              <Field compact error={fieldErrors.capacity} label="Posti max">
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={(value) => {
                    setCapacity(value);
                    clearFieldError("capacity");
                  }}
                  placeholder="Illimitati"
                  placeholderTextColor={form.placeholder.color}
                  style={styles.input}
                  value={capacity}
                />
                {!editing ? (
                  <Pressable
                    accessibilityLabel={countCreator ? "Non contarmi tra i partecipanti" : "Conta anche me tra i partecipanti"}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: countCreator }}
                    onPress={() => setCountCreator((current) => !current)}
                    style={styles.countMeRow}
                  >
                    <View style={[styles.checkbox, countCreator && styles.checkboxChecked]}>
                      {countCreator ? <Ionicons color={colors.surface} name="checkmark" size={14} /> : null}
                    </View>
                    <Text style={styles.countMeText}>Conta anche me</Text>
                  </Pressable>
                ) : null}
              </Field>
              <Field compact error={fieldErrors.price} label="Costo (EUR)">
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={(value) => {
                    setPrice(value);
                    clearFieldError("price");
                  }}
                  placeholder="0 = gratis"
                  placeholderTextColor={form.placeholder.color}
                  style={styles.input}
                  value={price}
                />
              </Field>
            </View>

            <FormField label="Tipo chat">
              <ChatChoice
                active={chatMode === "Gruppo aperto"}
                icon="💬"
                subtitle="Tutti possono scrivere"
                title="Chat di gruppo"
                onPress={() => setChatMode("Gruppo aperto")}
              />
              <ChatChoice
                active={chatMode === "Solo annunci"}
                icon="📣"
                subtitle="Solo tu scrivi"
                title="Solo annunci"
                onPress={() => setChatMode("Solo annunci")}
              />
            </FormField>
          </View>
        )}

        {step === 2 && (
          <View style={styles.reviewStack}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Anteprima evento</Text>
              <Text style={styles.stepSubtitle}>Controlla come apparira prima della pubblicazione.</Text>
            </View>
            <View pointerEvents="none" style={styles.previewWrapper}>
              <EventCard
                event={previewEvent}
                favorite={false}
                onPress={() => undefined}
                onToggleFavorite={() => undefined}
                registered={false}
              />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomAction}>
        <Pressable
          accessibilityLabel={step === 2 ? (editing ? "Salva modifiche evento" : "Pubblica evento") : "Vai al passaggio successivo"}
          accessibilityRole="button"
          disabled={publishing}
          onPress={goNext}
          style={[styles.primaryButton, publishing && styles.disabledPrimary]}
        >
          <Text style={styles.primaryText}>
            {publishing ? "Verifico luogo..." : step === 2 ? (editing ? "Salva modifiche" : "Pubblica evento") : "Avanti"}
          </Text>
          {!publishing ? (
            <Ionicons color={colors.surface} name={step === 2 ? "checkmark" : "arrow-forward"} size={18} />
          ) : null}
        </Pressable>
      </View>

      <Modal animationType="fade" onRequestClose={() => setPlaceMapOpen(false)} visible={placeMapOpen}>
        <View style={styles.fullscreenMapRoot}>
          <PlacePickerMap
            category={selectedType.category}
            coordinates={placeCoordinates}
            fallbackCoordinates={originCoordinates}
            fullscreen
            onChange={chooseMapCoordinates}
            onClose={() => setPlaceMapOpen(false)}
          />
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setSubcategorySelectOpen(false)}
        transparent
        visible={subcategorySelectOpen}
      >
        <Pressable
          accessibilityLabel="Chiudi selezione sottocategoria"
          accessibilityRole="button"
          onPress={() => setSubcategorySelectOpen(false)}
          style={styles.selectOverlay}
        >
          <Pressable accessibilityRole="menu" onPress={(event) => event.stopPropagation()} style={styles.selectSheet}>
            <View style={styles.selectHeader}>
              <Text style={styles.selectTitle}>Sottocategoria</Text>
              <Pressable
                accessibilityLabel="Chiudi"
                accessibilityRole="button"
                onPress={() => setSubcategorySelectOpen(false)}
                style={styles.selectClose}
              >
                <Ionicons color={colors.ink} name="close" size={20} />
              </Pressable>
            </View>

            {subcategoryOptions.map((option) => {
              const selected = option === selectedSubcategory;
              return (
                <Pressable
                  accessibilityLabel={`Scegli ${option}`}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                  key={option}
                  onPress={() => chooseSubcategory(option)}
                  style={[styles.selectOption, selected && styles.selectOptionActive]}
                >
                  <Text style={[styles.selectOptionText, selected && styles.selectOptionTextActive]}>{option}</Text>
                  {selected ? <Ionicons color={selectedAccent} name="checkmark" size={20} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  children: ReactNode;
  compact?: boolean;
  error?: string;
  label: string;
};

function Field({ children, compact = false, error, label }: FieldProps) {
  return (
    <FormField compact={compact} error={error} label={label}>
      {children}
    </FormField>
  );
}

type ChatChoiceProps = {
  active: boolean;
  icon: string;
  onPress: () => void;
  subtitle: string;
  title: string;
};

function ChatChoice({ active, icon, onPress, subtitle, title }: ChatChoiceProps) {
  return (
    <Pressable
      accessibilityLabel={`Seleziona ${title}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chatChoice, active && styles.chatChoiceActive]}
    >
      <View style={[styles.chatAccent, active && styles.chatAccentActive]} />
      <View style={styles.chatCopy}>
        <Text style={styles.chatTitle}>
          {icon} {title}
        </Text>
        <Text style={styles.chatSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1
  },
  topBar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  headerTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 20,
    fontWeight: "900"
  },
  cancelButton: {
    paddingVertical: spacing.sm
  },
  cancelText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "700"
  },
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 112
  },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center"
  },
  progressDot: {
    backgroundColor: colors.line,
    borderRadius: 4,
    height: 7,
    width: 30
  },
  progressDotActive: {
    backgroundColor: createPrimary,
    width: 38
  },
  formErrorText: {
    backgroundColor: colors.roseSoft,
    borderColor: "#F3B7B7",
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    padding: spacing.sm
  },
  panel: {
    gap: spacing.lg
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  inlineFields: {
    flexDirection: "row",
    gap: spacing.lg
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    ...form.fieldText,
    ...shadow
  },
  inputError: {
    borderColor: colors.danger
  },
  countMeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 36
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  checkboxChecked: {
    backgroundColor: createPrimary,
    borderColor: createPrimary
  },
  countMeText: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "800"
  },
  selectButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: spacing.md,
    ...shadow
  },
  selectText: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "800"
  },
  selectOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(20, 20, 20, 0.28)",
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.lg
  },
  selectSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    gap: spacing.sm,
    maxWidth: 520,
    padding: spacing.lg,
    width: "100%",
    ...shadow
  },
  selectHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  selectTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  selectClose: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  selectOption: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: spacing.md
  },
  selectOptionActive: {
    backgroundColor: createPrimarySoft,
    borderColor: createPrimary
  },
  selectOptionText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  selectOptionTextActive: {
    color: createPrimary,
    fontWeight: "900"
  },
  autocompleteWrap: {
    gap: spacing.sm
  },
  placeInputWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    ...shadow
  },
  placeInput: {
    flex: 1,
    minHeight: 54,
    ...form.fieldText
  },
  locateFieldButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  locateFieldButtonDisabled: {
    opacity: 0.55
  },
  suggestionList: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
    ...shadow
  },
  suggestionRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  suggestionIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  suggestionCopy: {
    flex: 1
  },
  suggestionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  suggestionMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3
  },
  suggestionDistance: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  textArea: {
    minHeight: 128,
    paddingTop: spacing.md,
    textAlignVertical: "top"
  },
  warningText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    marginTop: -spacing.sm
  },
  fullscreenMapRoot: {
    backgroundColor: colors.background,
    flex: 1
  },
  chatChoice: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 96,
    padding: spacing.lg
  },
  chatChoiceActive: {
    backgroundColor: createPrimarySoft,
    borderColor: createPrimary
  },
  chatAccent: {
    backgroundColor: colors.line,
    borderRadius: 7,
    width: 6
  },
  chatAccentActive: {
    backgroundColor: createPrimary
  },
  chatCopy: {
    flex: 1,
    justifyContent: "center"
  },
  chatTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  chatSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4
  },
  reviewStack: {
    gap: spacing.md
  },
  stepHeader: {
    gap: spacing.xs
  },
  stepTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27
  },
  stepSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  previewWrapper: {
    alignSelf: "stretch"
  },
  bottomAction: {
    alignItems: "flex-end",
    backgroundColor: colors.background,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    padding: spacing.lg,
    position: "absolute",
    right: 0
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: createPrimary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 50,
    minWidth: 142,
    paddingHorizontal: spacing.xl,
    ...shadow
  },
  disabledPrimary: {
    backgroundColor: colors.muted
  },
  primaryText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  }
});
