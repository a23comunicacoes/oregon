<script setup>
  import { layoutConfig } from "@layouts";
  import { can } from "@layouts/plugins/casl";
  import { useLayoutConfigStore, useCookieStore } from "@layouts/stores/config";
  import {
    getComputedNavLinkToProp,
    getDynamicI18nProps,
    isNavLinkActive,
  } from "@layouts/utils";

  const props = defineProps({
    item: {
      type: null,
      required: true,
    },
  });

  const cookieStore = useCookieStore();

  const configStore = useLayoutConfigStore();
  const hideTitleAndBadge = configStore.isVerticalNavMini();

  const userData = cookieStore.userData;

  const checkCanGeral = (geral) => {
    if (!geral) return true;

    const types = [
      "manage",
      "view",
      "edit",
      "create",
      "delete",
      "atender",
      "cancel",
      "remarcar",
      "view-all",
      "confirmar",
      "gerar",
    ];

    for (let type of types) {
      if (can(type, geral)) {
        return true;
      }
    }

    return false;
  };
</script>

<template>
  <li
    v-if="can(item.action, item.subject) && (item.subjectGeral ? checkCanGeral(item.subjectGeral) : true)"
    class="nav-link"
    :class="{ disabled: item.disable }"
  >
    <Component
      :is="item.to ? 'RouterLink' : 'a'"
      v-bind="getComputedNavLinkToProp(item)"
      :class="{
        'router-link-active router-link-exact-active': isNavLinkActive(
          item,
          $router
        ),
      }"
    >
      <Component
        :is="layoutConfig.app.iconRenderer || 'div'"
        v-bind="item.icon || layoutConfig.verticalNav.defaultNavItemIconProps"
        class="nav-item-icon"
      />
      <TransitionGroup name="transition-slide-x">
        <!-- 👉 Title -->
        <Component
          :is="layoutConfig.app.i18n.enable ? 'i18n-t' : 'span'"
          v-show="!hideTitleAndBadge"
          key="title"
          class="nav-item-title"
          v-bind="getDynamicI18nProps(item.title, 'span')"
        >
          {{ item.title }}
        </Component>

        <!-- 👉 Badge -->
        <Component
          :is="layoutConfig.app.i18n.enable ? 'i18n-t' : 'span'"
          v-if="item.badgeContent && !status_assinatura"
          v-show="!hideTitleAndBadge"
          key="badge"
          class="nav-item-badge"
          :class="item.badgeClass"
          v-bind="getDynamicI18nProps(item.badgeContent, 'span')"
        >
          {{ item.badgeContent }}
        </Component>
      </TransitionGroup>
    </Component>
  </li>
</template>

<style lang="scss">
  .layout-vertical-nav {
    .nav-link a {
      display: flex;
      align-items: center;
    }

    .bg-pro {
      border: 1px #458fd3a8 solid;
      border-radius: 7px !important;
      margin-left: 8px;
      color: #458fd3a8;
    }
  }
</style>
