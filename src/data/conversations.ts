import type { Driver, Trip, Vehicle, WhatsAppMessage } from '@/lib/types'

/**
 * Seeded WhatsApp conversations.
 *
 * These exist so the demo opens on real dispatch traffic rather than a single
 * placeholder exchange — and so the Groq auto-reply has genuine history to read
 * back. Each scenario is a multi-turn thread with realistic Kenyan road context;
 * the driver's actual vehicle and trip are interpolated at seed time so what the
 * thread says matches what the rest of the app shows.
 */

type Turn = {
  /** 'in' = from the driver, 'out' = from dispatch. */
  dir: 'in' | 'out'
  /** Minutes before "now" this message was sent. */
  ago: number
  body: string
  /** Sent by the auto-reply bot rather than a human dispatcher. */
  bot?: boolean
}

interface Scenario {
  key: string
  turns: Turn[]
}

// {first} driver first name · {vehicle} vehicle name · {plate} · {ref} trip ref
// {origin} · {dest} · {cargo}
const SCENARIOS: Scenario[] = [
  {
    key: 'traffic-delay',
    turns: [
      { dir: 'out', ago: 96, body: 'Morning {first}. Trip {ref} is loaded and ready — {origin} to {dest}, cargo is {cargo}. Confirm when you are moving.' },
      { dir: 'in', ago: 92, body: 'Received boss. Pulling out of the yard now.' },
      { dir: 'in', ago: 41, body: 'Heavy traffic on Mombasa Road after the Cabanas exit. Running about 25 minutes late.' },
      { dir: 'out', ago: 39, body: 'Noted, thanks for flagging early. I have pushed the ETA on the system and told the client.' },
      { dir: 'in', ago: 12, body: 'Now moving again. Should recover some time on the bypass.' },
    ],
  },
  {
    key: 'warning-light',
    turns: [
      { dir: 'in', ago: 63, body: 'There is an engine warning light on the dashboard of {vehicle}. It came on just after Athi River.' },
      { dir: 'out', ago: 61, body: 'Thanks for reporting. Is the temperature gauge normal, and is the vehicle still pulling well?' },
      { dir: 'in', ago: 58, body: 'Temperature is okay but it feels heavy on the hills. No smoke.' },
      { dir: 'out', ago: 55, body: 'Understood. Continue slowly to the Kitengela stage and park safely there. I am sending a mechanic to you — do not push it uphill.' },
      { dir: 'in', ago: 51, body: 'Okay I am parked at the stage. Waiting.' },
      { dir: 'out', ago: 34, body: 'Mechanic is 20 minutes away. Trip {ref} has been put on hold, no pressure on the ETA.' },
    ],
  },
  {
    key: 'fuel-card',
    turns: [
      { dir: 'in', ago: 210, body: 'Fuel is low on {plate}, about a quarter tank left. Can I fill at the Ruiru station?' },
      { dir: 'out', ago: 208, body: 'Yes, use the fleet card at Ruiru. Diesel only, and please send the receipt photo after.' },
      { dir: 'in', ago: 176, body: 'Filled 62 litres. Receipt sent to the office number.' },
      { dir: 'out', ago: 172, body: 'Received, thank you. Logged against {vehicle}.' },
    ],
  },
  {
    key: 'checkpoint',
    turns: [
      { dir: 'in', ago: 145, body: 'Police checkpoint before Naivasha. They are asking for the insurance sticker and the load documents.' },
      { dir: 'out', ago: 143, body: 'The insurance is current — I am sending the certificate to your phone now. The delivery note for {cargo} is in the folder behind your seat.' },
      { dir: 'in', ago: 121, body: 'They have cleared me. Back on the road.' },
      { dir: 'out', ago: 119, body: 'Good. Keep the folder with you, that stretch is checked often.' },
    ],
  },
  {
    key: 'offload-wait',
    turns: [
      { dir: 'in', ago: 74, body: 'I have reached {dest} but the store is not ready to receive. The gate says wait for their supervisor.' },
      { dir: 'out', ago: 72, body: 'Understood. Stay inside the compound and keep the vehicle locked. I am calling their supervisor now.' },
      { dir: 'in', ago: 47, body: 'Still waiting. It is almost an hour now.' },
      { dir: 'out', ago: 44, body: 'Sorry for the delay. They have confirmed a bay opens at the top of the hour. Waiting time is being logged on {ref} so it does not count against you.' },
    ],
  },
  {
    key: 'weather-detour',
    turns: [
      { dir: 'in', ago: 300, body: 'Heavy rain from Limuru side, the murram section is flooded. I cannot pass with a full load.' },
      { dir: 'out', ago: 297, body: 'Do not attempt it. Turn back and use the tarmac route through Kikuyu — it adds about 18 km but it is safe.' },
      { dir: 'in', ago: 294, body: 'Okay turning back now.' },
      { dir: 'out', ago: 290, body: 'ETA on {ref} updated to account for the detour. Drive carefully, visibility is poor.' },
      { dir: 'in', ago: 258, body: 'Through the bad section now. Road is clear from here.' },
    ],
  },
  {
    key: 'leave-request',
    turns: [
      { dir: 'in', ago: 1_450, body: 'Boss, I would like to request two days off next week, Thursday and Friday. Family function upcountry.' },
      { dir: 'out', ago: 1_440, body: 'Noted {first}. Thursday and Friday are fine — I will assign {vehicle} to a relief driver for those days.' },
      { dir: 'in', ago: 1_435, body: 'Thank you very much.' },
    ],
  },
  {
    key: 'delivered-pod',
    turns: [
      { dir: 'out', ago: 520, body: 'Trip {ref} dispatched: {origin} to {dest}. Cargo: {cargo}. Please confirm.', bot: true },
      { dir: 'in', ago: 516, body: 'Confirmed.' },
      { dir: 'in', ago: 337, body: 'Arrived and offloaded. The storekeeper has signed the delivery note.' },
      { dir: 'out', ago: 335, body: 'Trip {ref} marked as completed. Great work.', bot: true },
      { dir: 'in', ago: 332, body: 'Photo of the signed note sent to the office.' },
      { dir: 'out', ago: 330, body: 'Received, thank you. Head back to the yard when you are ready.' },
    ],
  },
  {
    key: 'puncture',
    turns: [
      { dir: 'in', ago: 88, body: 'Puncture on the rear left tyre, just past Juja on Thika Road. I am on the shoulder.' },
      { dir: 'out', ago: 86, body: 'Are you and the load safe? Put out the triangles and stand off the carriageway.' },
      { dir: 'in', ago: 84, body: 'Yes we are safe. Triangles are out.' },
      { dir: 'out', ago: 80, body: 'Recovery is dispatched to your location. Do not change it alone on that stretch, the trucks pass too close.' },
      { dir: 'in', ago: 43, body: 'They have changed it. Tyre is holding, continuing to {dest}.' },
      { dir: 'out', ago: 41, body: 'Well handled. Please have the spare replaced when you return to the yard.' },
    ],
  },
  {
    key: 'new-route',
    turns: [
      { dir: 'in', ago: 190, body: 'This is my first run to {dest}. Which gate do I use for deliveries?' },
      { dir: 'out', ago: 187, body: 'Use the service gate on the left of the main entrance, not the front one — trucks are turned away at the front. Ask for the receiving bay.' },
      { dir: 'in', ago: 185, body: 'Understood, thank you.' },
      { dir: 'out', ago: 183, body: 'I have also saved the site contact against {ref} in case you need them at the gate.' },
    ],
  },
  {
    key: 'idle-checkin',
    turns: [
      { dir: 'out', ago: 33, body: 'The tracker shows {vehicle} stationary for over 20 minutes near the CBD. Everything okay?' },
      { dir: 'in', ago: 30, body: 'Yes, I stopped for lunch. Will be moving in ten minutes.' },
      { dir: 'out', ago: 28, body: 'No problem, thanks for confirming. Enjoy your break.' },
    ],
  },
  {
    key: 'night-run',
    turns: [
      { dir: 'out', ago: 700, body: 'Night run tonight on {ref} — {origin} to {dest}. Are you rested enough to take it?' },
      { dir: 'in', ago: 694, body: 'Yes I slept in the afternoon. I can take it.' },
      { dir: 'out', ago: 690, body: 'Good. Stop only at the lit stations, and message me when you reach Salgaa.' },
      { dir: 'in', ago: 402, body: 'Passed Salgaa safely. Road is quiet.' },
      { dir: 'out', ago: 400, body: 'Received. Keep going, and take a break if you feel sleepy.' },
    ],
  },
]

const uid = (scenario: string, i: number) => `msg-seed-${scenario}-${i}`

/**
 * Attach the scenarios to real drivers so every thread lines up with that
 * driver's actual vehicle and trip.
 */
export function buildSeedConversations(drivers: Driver[], vehicles: Vehicle[], trips: Trip[]): WhatsAppMessage[] {
  const messages: WhatsAppMessage[] = []
  const now = Date.now()

  SCENARIOS.forEach((scenario, idx) => {
    const driver = drivers[idx]
    if (!driver) return
    const vehicle = vehicles.find((v) => v.id === driver.vehicleId)
    const trip = trips.find((t) => t.id === vehicle?.activeTripId) ?? trips.find((t) => t.driverId === driver.id)

    const fill = (body: string) =>
      body
        .replace(/\{first\}/g, driver.name.split(' ')[0])
        .replace(/\{vehicle\}/g, vehicle?.name ?? 'your vehicle')
        .replace(/\{plate\}/g, vehicle?.plate ?? 'the vehicle')
        .replace(/\{ref\}/g, trip?.reference ?? 'the trip')
        .replace(/\{origin\}/g, trip?.origin ?? 'the yard')
        .replace(/\{dest\}/g, trip?.destination ?? 'the drop-off')
        .replace(/\{cargo\}/g, (trip?.cargo ?? 'general goods').toLowerCase())

    scenario.turns.forEach((turn, i) => {
      messages.push({
        id: uid(scenario.key, i),
        driverId: driver.id,
        direction: turn.dir === 'in' ? 'inbound' : 'outbound',
        body: fill(turn.body),
        createdAt: now - turn.ago * 60_000,
        status: 'read',
        automated: turn.bot,
        source: turn.bot ? 'rules' : undefined,
      })
    })
  })

  return messages.sort((a, b) => a.createdAt - b.createdAt)
}
