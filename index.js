const SUBSCRIBE_EVENT = 'newsletter_subscribe'
const UNSUBSCRIBE_EVENT = 'newsletter_unsubscribe'
const SEND_NEWSLETTER_EVENT = 'send_newsletter'
const TRIGGER_NEWSLETTER_EVENT = 'trigger_newsletter'
const NEWSLETTER_SUBSCRIBERS_STORAGE_KEY = 'newsletter_subscribers'

export const jobs = {
    'List all subscribers': async (_, { storage }) => {
        const subscribersList  = await getCurrentSubscribersList(storage)
        console.log('Current newsletter subscribers:', subscribersList.join(', '))
    }
}

export async function onEvent(event, meta) {
    if (event.event === SUBSCRIBE_EVENT) {
        await addNewSubscriber(event, meta)
    } else if (event.event === UNSUBSCRIBE_EVENT) {
        await removeSubscriber(event, meta)
    } else if (event.event === TRIGGER_NEWSLETTER_EVENT) {
        await triggerNewsletterEvent(event, meta)
    }
}

async function addNewSubscriber(event, { storage }) {
    const newSubscriberEmail = event.properties?.new_subscriber_email

    if (!newSubscriberEmail) {
        console.log(`No email found to add to the subscribers list.`)
        return
    }

    const subscribersList = await getCurrentSubscribersList(storage)
    console.log(`Adding ${newSubscriberEmail} to the subscribers list.`)
    subscribersList.push(newSubscriberEmail)
    await storage.set(NEWSLETTER_SUBSCRIBERS_STORAGE_KEY, JSON.stringify(subscribersList))
    console.log(`Successfully added ${newSubscriberEmail} to the subscribers list.`)

}

// users can unsubscribe by replying to the newsletter (the admin will trigger the removal)
// this manual process prevents a random person from unsubscribing others
async function removeSubscriber(event, { storage, config }) {
    if (event.properties?.newsletter_secret !== config.newsletterSecret) {
        console.log(`Incorrect secret. Skipping subscriber removal.`)
        return
    }

    const emailToRemove = event.properties?.unsubscribe_request_email

    if (!emailToRemove) {
        console.log(`No email found to add to the subscribers list.`)
        return
    }

    const subscribersList = await getCurrentSubscribersList(storage)
    subscribersList = subscribersList.filter(email => email !== emailToRemove)
    await storage.set(NEWSLETTER_SUBSCRIBERS_STORAGE_KEY, JSON.stringify(subscribersList))
    console.log(`Successfully removed ${emailToRemove} from the subscribers list.`)

}

async function triggerNewsletterEvent(event, { storage, config }) {
    const subscribersList = await getCurrentSubscribersList(storage)

    if (!event.properties || !event.properties.content || event.properties.newsletter_secret !== config.newsletterSecret) {
        console.log(`Unable to trigger newsletter. Secret missing or incorrect.`)
        return
    }

    console.log(`Triggering newsletter!`)
    await posthog.capture(SEND_NEWSLETTER_EVENT, {
        email_addresses: String(subscribersList),
        content: event.properties.content
    })

}

async function getCurrentSubscribersList(storage) {
    const storedSubscribers = await storage.get(NEWSLETTER_SUBSCRIBERS_STORAGE_KEY, '[]')
    const subscribersList = JSON.parse(storedSubscribers)
    return subscribersList
}
