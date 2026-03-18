<template>
  <div class="space-y-6">
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <h1 class="text-3xl font-bold text-neutral-900">
        {{ t("campaigns.title") }}
      </h1>
      <Button
        variant="primary"
        @click="$router.push({ name: 'campaigns-create' })"
      >
        {{ t("campaigns.create") }}
      </Button>
    </div>

    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1 max-w-md">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('campaigns.searchPlaceholder')"
          class="input w-full"
        />
      </div>
      <select v-model="statusFilter" class="input w-full sm:w-auto">
        <option value="">{{ t("common.allStatuses") }}</option>
        <option value="DRAFT">{{ t("campaigns.statusDraft") }}</option>
        <option value="SCHEDULED">{{ t("campaigns.statusScheduled") }}</option>
        <option value="RUNNING">{{ t("campaigns.statusRunning") }}</option>
        <option value="COMPLETED">{{ t("campaigns.statusCompleted") }}</option>
        <option value="FAILED">{{ t("campaigns.statusFailed") }}</option>
      </select>
      <Button variant="outline" :loading="loading" @click="handleRefresh">
        {{ t("common.refresh") }}
      </Button>
    </div>

    <LoadingSpinner v-if="loading && campaigns.length === 0" full-page />

    <div
      v-else-if="filteredCampaigns.length === 0"
      class="card text-center py-12"
    >
      <p class="text-neutral-600 mb-4">{{ t("campaigns.noCampaigns") }}</p>
      <Button
        variant="primary"
        @click="$router.push({ name: 'campaigns-create' })"
      >
        {{ t("campaigns.createFirst") }}
      </Button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <CampaignCard
        v-for="campaign in filteredCampaigns"
        :key="campaign.id"
        :campaign="campaign"
        @click="
          $router.push({
            name: 'campaigns-detail',
            params: { id: campaign.id },
          })
        "
        @delete="requestDeleteCampaign(campaign)"
      />
    </div>

    <Modal v-model:show="showDeleteModal" size="md" @close="closeDeleteModal">
      <template #header>
        <h2 class="text-lg font-semibold text-neutral-900">
          {{ t("campaigns.deleteConfirmTitle") }}
        </h2>
      </template>

      <p class="text-sm text-neutral-700">
        {{ t("campaigns.deleteConfirmMessage", { name: deleteTargetName }) }}
      </p>

      <template #footer>
        <div class="flex justify-end gap-3">
          <Button
            variant="outline"
            :disabled="deletingCampaign"
            @click="closeDeleteModal"
          >
            {{ t("common.cancel") }}
          </Button>
          <Button
            variant="primary"
            :loading="deletingCampaign"
            @click="confirmDeleteCampaign"
          >
            {{ t("common.delete") }}
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useCampaigns } from "../composables/useCampaigns.js";
import { useNotifications } from "../composables/useNotifications.js";
import CampaignCard from "../components/campaign/CampaignCard.vue";
import Button from "../components/common/Button.vue";
import LoadingSpinner from "../components/common/LoadingSpinner.vue";
import Modal from "../components/common/Modal.vue";

const { t } = useI18n();
const { campaigns, loading, fetchCampaigns, deleteCampaign } = useCampaigns();
const { success: notifySuccess, error: notifyError } = useNotifications();

const searchQuery = ref("");
const statusFilter = ref("");
const showDeleteModal = ref(false);
const selectedCampaign = ref(null);
const deletingCampaign = ref(false);

const filteredCampaigns = computed(() => {
  let filtered = [...campaigns.value];

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (campaign) =>
        campaign.name.toLowerCase().includes(query) ||
        campaign.eventTitle.toLowerCase().includes(query),
    );
  }

  if (statusFilter.value) {
    filtered = filtered.filter(
      (campaign) => campaign.status === statusFilter.value,
    );
  }

  return filtered;
});

async function handleRefresh() {
  try {
    await fetchCampaigns();
  } catch (error) {
    notifyError(t("campaigns.failedToRefreshList"));
  }
}

const deleteTargetName = computed(() => selectedCampaign.value?.name || "");

function requestDeleteCampaign(campaign) {
  selectedCampaign.value = campaign;
  showDeleteModal.value = true;
}

function closeDeleteModal(force = false) {
  if (deletingCampaign.value && !force) {
    return;
  }
  showDeleteModal.value = false;
  selectedCampaign.value = null;
}

async function confirmDeleteCampaign() {
  if (!selectedCampaign.value) {
    return;
  }

  deletingCampaign.value = true;
  try {
    await deleteCampaign(selectedCampaign.value.id);
    notifySuccess(t("notifications.campaignDeleted"));
    closeDeleteModal(true);
  } catch (error) {
    notifyError(t("campaigns.failedToDelete"));
  } finally {
    deletingCampaign.value = false;
  }
}

onMounted(async () => {
  try {
    await fetchCampaigns();
  } catch (error) {
    notifyError(t("campaigns.failedToLoadList"));
  }
});
</script>
