interface BasicWebsocketPayloadEvent {}

interface WebsocketPayloadEvent extends BasicWebsocketPayloadEvent {
    user_id: string;
    user_login: string;
    user_name: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
}

interface FollowPayloadEvent extends WebsocketPayloadEvent {
    followed_at: string; //could be date?
}

interface RewardRedemptionPayloadReward {
    id: string;
    title: string;
    cost: number;
    prompt: string;
}

interface RewardRedemptionPayloadEvent extends WebsocketPayloadEvent {
    user_input: string;
    status: string;
    reward: RewardRedemptionPayloadReward;
    redeemed_at: string; //Could be date?
}

interface SubscriptionPayloadEvent extends WebsocketPayloadEvent {
    tier: string;
    is_gift: boolean;
}

interface SubscriptionGiftPayloadEvent extends WebsocketPayloadEvent {
    total: number;
    tier: string;
    cumulative_total: number | undefined;
    is_anonymous: boolean;
}

interface RaidPayloadEvent extends BasicWebsocketPayloadEvent {
    viewers: number;
    from_broadcaster_user_id: string,
    from_broadcaster_user_login: string,
    from_broadcaster_user_name: string,
    to_broadcaster_user_id: string,
    to_broadcaster_user_login: string,
    to_broadcaster_user_name: string,
}

interface CheerPayloadEvent extends WebsocketPayloadEvent {
    bits: number;
    message: string;
    is_anonymous: boolean; //Is this necessary now that it's deprecated?
}

export {
    CheerPayloadEvent,
    RaidPayloadEvent,
    SubscriptionGiftPayloadEvent,
    SubscriptionPayloadEvent,
    FollowPayloadEvent,
    RewardRedemptionPayloadEvent,
    RewardRedemptionPayloadReward,
    WebsocketPayloadEvent,
    BasicWebsocketPayloadEvent
}