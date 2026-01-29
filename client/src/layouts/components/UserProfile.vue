<script setup>
  import { PerfectScrollbar } from "vue3-perfect-scrollbar";
  import { useCookieStore, useLayoutConfigStore } from "@layouts/stores/config";
  import { useAlert } from "@/composables/useAlert";
  import NavbarThemeSwitcher from "@/layouts/components/NavbarThemeSwitcher.vue";

  const cookieStore = useCookieStore();
  const { setAlert } = useAlert();

  const router = useRouter();
  const ability = useAbility();

  const userData = useCookie("userData");
  const userAbilityRules = useCookie("userAbilityRules");
  const accessToken = useCookie("accessToken");

  const abilityCookieStore = cookieStore.userAbilityRules
    ? typeof cookieStore.userAbilityRules === "string"
      ? JSON.parse(cookieStore.userAbilityRules)
      : cookieStore.userAbilityRules
    : [];

  ability.update(abilityCookieStore);

  if (accessToken == "" || userData == "") {
    setAlert(
      "Ocorreu um erro com seu acesso. Faça login novamente.",
      "error",
      "tabler-alert-triangle",
      3000
    );

    //Redirect to login page
    router.push("/login");
  }

  watch(
    () => cookieStore.userData,
    (newValueUserData, oldValueUserData) => {
      if (newValueUserData) {
        userData.value = newValueUserData;
      }

      //Se o ID do usuário mudou, limpe todos os cookies
      if (newValueUserData && oldValueUserData) {
        if (
          newValueUserData.id != oldValueUserData.id ||
          newValueUserData.email != oldValueUserData.email
        ) {
          useCookie("userAbilityRules").value = null;
          ability.update([]);
          useCookie("userData").value = null;
          useCookie("accessToken").value = null;

          setAlert(
            "Seu acesso expirou! Faça login novamente para continuar.",
            "error",
            "tabler-alert-triangle",
            3000
          );

          router.push("/login");
        }
      }
    },
    { deep: true }
  );

  const logout = async () => {
    // Remove "accessToken" from cookie
    useCookie("accessToken").value = null;

    // Remove "userData" from cookie
    userData.value = null;

    // ℹ️ We had to remove abilities in then block because if we don't nav menu items mutation is visible while redirecting user to login page

    // Remove "userAbilities" from cookie
    useCookie("userAbilityRules").value = null;

    // Reset ability to initial ability
    ability.update([]);

    //Redirect to login page
    window.location.href = "/login";
  };

  let title_item = "Meu Perfil";
  let link_item = "apps-user-view-id";

  const userProfileList = [
    { type: "divider" },
    {
      type: "tema",
    },
    { type: "divider" },
    {
      type: "navItem",
      icon: "tabler-user",
      title: title_item,
      to: {
        name: link_item,
        params: { id: userData.value.id },
      },
    },
    { type: "divider" },
    {
      type: "navItem",
      icon: "tabler-logout",
      title: "Sair",
      onClick: logout,
    },
  ];

  const configStore = useLayoutConfigStore();

  const menuCurto = ref(configStore.isVerticalNavCollapsed);

  watch(
    () => configStore.isVerticalNavCollapsed,
    (newValue) => {
      menuCurto.value = newValue;
    },
    { immediate: true }
  );
</script>

<template>
  <VList class="overflow-hidden mb-5" style="cursor: pointer">
    <VListItem>
      <template #prepend>
        <VListItemAction start>
          <VBadge
            dot
            location="bottom right"
            offset-x="3"
            offset-y="3"
            color="success"
            bordered
          >
            <VAvatar
              :color="!(userData && userData.avatar) ? 'primary' : undefined"
              :variant="!(userData && userData.avatar) ? 'tonal' : undefined"
            >
              <VImg
                v-if="userData && userData.avatar"
                :src="userData.avatar"
                cover
              />
              <VIcon v-else icon="tabler-user" />
            </VAvatar>
          </VBadge>
        </VListItemAction>
      </template>

      <VListItemTitle class="font-weight-medium">
        {{ userData.fullName || userData.username }}
      </VListItemTitle>
      <VListItemSubtitle style="text-transform: capitalize">
        {{ userData.role }}
      </VListItemSubtitle>
    </VListItem>

    <!-- SECTION Menu -->
    <VMenu activator="parent" width="230" location="bottom end" offset="14px">
      <VList>
        <VListItem>
          <template #prepend>
            <VListItemAction start>
              <VBadge
                dot
                location="bottom right"
                offset-x="3"
                offset-y="3"
                color="success"
                bordered
              >
                <VAvatar
                  :color="
                    !(userData && userData.avatar) ? 'primary' : undefined
                  "
                  :variant="
                    !(userData && userData.avatar) ? 'tonal' : undefined
                  "
                >
                  <VImg
                    v-if="userData && userData.avatar"
                    :src="userData.avatar"
                    cover
                  />
                  <VIcon v-else icon="tabler-user" />
                </VAvatar>
              </VBadge>
            </VListItemAction>
          </template>

          <VListItemTitle class="font-weight-medium">
            {{ userData.fullName || userData.username }}
          </VListItemTitle>
          <VListItemSubtitle>{{ userData.role }}</VListItemSubtitle>
        </VListItem>

        <PerfectScrollbar :options="{ wheelPropagation: false }">
          <template v-for="item in userProfileList" :key="item.title">
            <VListItem
              v-if="item.type === 'navItem'"
              :to="item.to"
              @click="item.onClick && item.onClick()"
            >
              <template #prepend>
                <VIcon class="me-2" :icon="item.icon" size="22" />
              </template>

              <VListItemTitle>{{ item.title }}</VListItemTitle>

              <template v-if="item.badgeProps" #append>
                <VBadge v-bind="item.badgeProps" />
              </template>
            </VListItem>

            <NavbarThemeSwitcher v-else-if="item.type === 'tema'" />

            <VDivider v-else class="my-2" />
          </template>
        </PerfectScrollbar>
      </VList>
    </VMenu>
  </VList>
  <!-- !SECTION -->
</template>

<style>
  .layout-vertical-nav-collapsed .icone-trocar {
    display: none !important;
  }

  .layout-vertical-nav.hovered .icone-trocar {
    display: block !important;
  }
</style>
