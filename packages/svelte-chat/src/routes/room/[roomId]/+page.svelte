<script>
  import { currentUser } from '$lib/stores/auth';
  import { graphql, cache } from '$houdini';
  import { page } from '$app/stores';
  import { onDestroy, onMount, afterUpdate } from 'svelte';
  import Icon from '@iconify/svelte';

  /** @type { import('./$houdini').PageData } */
  export let data;

  $: currUser = $currentUser;
  $: ({ Room } = data)
  $: currentRoom = $Room?.data?.room;
  $: recipient = $Room?.data?.room.users?.find((user) => user.id !== currUser.me.id);

  onDestroy(() => {
    cache.reset();
  });

  const listener = graphql`
    subscription MessageCreated {
      messageCreated {
        id
        text
        createdAt
        user {
          id
          name
        }
        room {
          id
        }
      }
    }
  `;

  const userStatusListener = graphql`
		subscription UserStatusUpdated2 {
			userStatusUpdated {
				id
				is_online
			}
		}
	`;

  const message = graphql`
    mutation CreateMessage($room: String!, $text: String!) {
      createMessage(input: { room: $room, text: $text }) {
        id
        text
        createdAt
        user {
          id
          name
        }
      }
    }
  `

  $: userStatusListener.listen();
  $: {
    if ($userStatusListener.data) {
      const updatedUser = $userStatusListener.data.userStatusUpdated;
      if (updatedUser.id === recipient?.id) {
        // @ts-ignore
        recipient.is_online = updatedUser.is_online;
      }
    }
  }

  $: listener.listen();
  $: {
    if ($listener.data) {
      if ($listener.data.messageCreated.room.id === $page.params.roomId) {
        Room.fetch({ policy: 'NetworkOnly' })
      }
    }
  }

  let messageText = '';

  async function sendMessage() {
    if (messageText) {
      await message.mutate({ room: $page.params.roomId, text: messageText })
      Room.fetch({ policy: 'NetworkOnly' })
      messageText = '';
    }
  }

  /**
     * @type {HTMLDivElement}
     */
  let messagesContainer;

  const scrollToBottom = () => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  onMount(() => {
    scrollToBottom();
  });

  afterUpdate(() => {
    scrollToBottom();
  });
</script>

<div class="mt-24 flex items-center justify-center">
  {#if currentRoom}
    <div class="max-w-md w-full">
      <h1 class="text-3xl font-bold mb-4">Chat Room</h1>

      <!-- Display the recipient and its online status here -->
      <p class="ml-1 font-semibold">{recipient?.name}</p>
      <p class="ml-1 font-bold mb-4 {recipient?.is_online ? "text-green-600" : "text-red-600"}">
        {recipient?.is_online ? 'Online' : 'Offline'}
      </p>

      <div bind:this={messagesContainer} class="border-t border-b overflow-y-auto max-h-96 p-4">
        {#if currentRoom.messages.length === 0}
          <div class="justify-center text-center space-y-1 py-4">
            <p class="font-semibold text-lg">
              Uh oh! No messages yet.
            </p>
            <div class="text-center justify-center flex"><Icon icon="et:chat" width="96" height="96" /></div>
            <span>Become the first to send a message!</span>
          </div>
        {:else}
          {#each currentRoom.messages as message (message.id) }
            <div class="mb-4 { message.user.id === currUser.me.id ? "text-right ml-auto" : "text-left" }">
              <p class="text-gray-500 mb-1">{message.user.name}:</p>
              <p>{message.text}</p>
              <p class="text-xs text-gray-400">{message.createdAt.toLocaleString()}</p>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Add message input and send button here -->
      <form class="flex" on:submit|preventDefault={sendMessage}>
        <input
          type="text"
          class="flex-1 border border-gray-300 rounded p-2"
          placeholder="Type your message..."
          bind:value={messageText}
        />
        <button
          type="submit"
          class="bg-blue-500 text-white rounded p-2 ml-2"
        >
          Send
        </button>
    </div>
  {:else}
    <p>Loading...</p>
  {/if}
</div>